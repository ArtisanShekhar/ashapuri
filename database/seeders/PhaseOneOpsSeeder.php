<?php

namespace Database\Seeders;

use App\Models\DishWasteLog;
use App\Models\KitchenSubmission;
use App\Models\StorePurchase;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PhaseOneOpsSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DishWasteLog::query()->delete();
            KitchenSubmission::query()->delete();
            StorePurchase::query()->delete();

            $startDate = Carbon::now()->subDays(29)->startOfDay();

            for ($day = 0; $day < 30; $day++) {
                $date = $startDate->copy()->addDays($day);

                $this->seedStorePurchasesForDay($date, $day);
                $this->seedKitchenForDay($date, $day);
            }
        });
    }

    private function seedStorePurchasesForDay(Carbon $date, int $day): void
    {
        $purchases = [
            // Core examples from brief: coffee overpay, paneer negotiate, rice mostly OK.
            ['Sharma Provisions', 'Coffee', 'Beverages', 2, 'packet', 60, 42, 2, 'Rate higher than online'],
            ['Mountain Dairy', 'Paneer', 'Dairy', 6, 'kg', 300, 280, 5, 'Quality stable'],
            ['Valley Grains', 'Rice', 'Pantry', 16, 'kg', 40, 38, 14, 'Standard grade'],
            ['Fresh Farm', 'Chicken', 'Meat', 10, 'kg', 235 + ($day % 3), 228, 9, 'Morning delivery'],
            ['Sabzi Point', 'Vegetables Mix', 'Vegetables', 18, 'kg', 52 + ($day % 4), 48, 16, 'Mixed seasonal lot'],
        ];

        foreach ($purchases as [$vendor, $item, $category, $qty, $unit, $costPerUnit, $marketRate, $issuedQty, $notes]) {
            // Price spike samples to trigger alerts.
            $adjustedCost = $costPerUnit;
            if ($item === 'Coffee' && in_array($day, [8, 15, 23], true)) {
                $adjustedCost = 65;
            }

            StorePurchase::create([
                'date' => $date->toDateString(),
                'vendor_name' => $vendor,
                'item_name' => $item,
                'item_category' => $category,
                'quantity' => $qty,
                'unit' => $unit,
                'cost_per_unit' => $adjustedCost,
                'total_cost' => $qty * $adjustedCost,
                'market_rate' => $marketRate,
                'issued_to_kitchen_qty' => $issuedQty,
                'notes' => $notes,
            ]);
        }
    }

    private function seedKitchenForDay(Carbon $date, int $day): void
    {
        $meals = [
            'breakfast' => 45 + ($day % 10),
            'lunch' => 72 + (($day * 2) % 14),
            'dinner' => 64 + (($day * 3) % 12),
        ];

        foreach ($meals as $meal => $expectedGuests) {
            $actualGuests = max(20, $expectedGuests - (($day + strlen($meal)) % 6) + 2);

            $submission = KitchenSubmission::create([
                'date' => $date->toDateString(),
                'meal_type' => $meal,
                'submitted_by' => 'Kitchen Supervisor',
                'expected_guests' => $expectedGuests,
                'actual_guests' => $actualGuests,
                'temperature_check_passed' => true,
                'dishes_ran_out' => $meal === 'lunch' && $day % 6 === 0 ? 'Chicken Curry' : '',
                'dishes_leftover' => $meal === 'dinner' ? 'Paneer Butter Masala' : 'Plain Rice',
                'portion_observation' => $day % 5 === 0 ? 'Piled high' : ($day % 3 === 0 ? 'Mixed' : 'Reasonable'),
                'biggest_waste_dish' => 'Paneer Butter Masala',
                'staff_meals_count' => 8 + ($day % 4),
                'staff_meals_qty' => 3 + ($day % 2),
                'quality_issues' => $day % 11 === 0 ? 'Paneer texture varied' : '',
                'went_well' => 'Service timing was smooth',
                'change_tomorrow' => 'Reduce paneer prep on low demand days',
            ]);

            $this->seedDishWasteRows($submission, $meal, $day);
        }
    }

    private function seedDishWasteRows(KitchenSubmission $submission, string $meal, int $day): void
    {
        $paneerPrepped = $meal === 'dinner' ? 5.2 : ($meal === 'lunch' ? 5.0 : 3.2);
        $paneerLeftover = $meal === 'dinner' ? 2.5 : ($meal === 'lunch' ? 2.2 : 1.3);
        $paneerPlate = $meal === 'lunch' ? 0.8 : 0.5;

        $dishRows = [
            // Mirrors the example table in your brief.
            ['Paneer Butter Masala', $paneerPrepped, $paneerLeftover + (($day % 4) * 0.1), $paneerPlate, 'Over-prep', 120],
            ['Chicken Curry', 4.0 + (($day % 3) * 0.2), 0.2 + (($day % 2) * 0.1), 0.3, $day % 6 === 0 ? 'Guest plate' : 'Over-prep', 95],
            ['Plain Rice', 8.0 + (($day % 5) * 0.3), 1.0 + (($day % 3) * 0.2), 0.5, 'Guest plate', 40],
        ];

        foreach ($dishRows as [$dishName, $prepped, $lineLeft, $plateWaste, $reason, $unitWasteCost]) {
            $totalWasteKg = $lineLeft + $plateWaste;
            DishWasteLog::create([
                'submission_id' => $submission->id,
                'dish_name' => $dishName,
                'quantity_prepped_kg' => round($prepped, 2),
                'quantity_line_leftover_kg' => round($lineLeft, 2),
                'quantity_plate_waste_kg' => round($plateWaste, 2),
                'waste_reason' => $reason,
                'calculated_waste_cost' => round($totalWasteKg * $unitWasteCost, 2),
            ]);
        }
    }
}
