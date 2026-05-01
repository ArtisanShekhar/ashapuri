<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DishWasteLog;
use App\Models\KitchenSubmission;
use App\Models\StorePurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        [$from, $to] = $this->periodRange($request->query('period', 'month'));

        $guests = (int) KitchenSubmission::whereBetween('date', [$from, $to])->sum('actual_guests');
        $wasteKg = (float) DishWasteLog::query()
            ->whereHas('submission', fn ($q) => $q->whereBetween('date', [$from, $to]))
            ->selectRaw('SUM(quantity_line_leftover_kg + quantity_plate_waste_kg) as waste')
            ->value('waste');
        $preppedKg = (float) DishWasteLog::query()
            ->whereHas('submission', fn ($q) => $q->whereBetween('date', [$from, $to]))
            ->sum('quantity_prepped_kg');
        $cost = (float) StorePurchase::whereBetween('date', [$from, $to])->sum('total_cost');

        return response()->json([
            'guests_served' => $guests,
            'food_waste_kg' => round($wasteKg, 2),
            'food_waste_percent' => $preppedKg > 0 ? round(($wasteKg / $preppedKg) * 100, 2) : 0,
            'cost_per_cover' => $guests > 0 ? round($cost / $guests, 2) : 0,
        ]);
    }

    public function guests()
    {
        [$from, $to] = $this->periodRange(request()->query('period', 'month'));
        $rows = KitchenSubmission::query()
            ->select('date', 'meal_type', DB::raw('SUM(actual_guests) as guests'))
            ->whereBetween('date', [$from, $to])
            ->groupBy('date', 'meal_type')
            ->orderBy('date')
            ->get();
        return response()->json($rows);
    }

    public function waste()
    {
        [$from, $to] = $this->periodRange(request()->query('period', 'month'));
        $rows = DishWasteLog::query()
            ->join('kitchen_submissions', 'kitchen_submissions.id', '=', 'dish_waste_logs.submission_id')
            ->select(
                'kitchen_submissions.date',
                DB::raw('SUM(dish_waste_logs.quantity_line_leftover_kg + dish_waste_logs.quantity_plate_waste_kg) as waste_kg')
            )
            ->whereBetween('kitchen_submissions.date', [$from, $to])
            ->groupBy('kitchen_submissions.date')
            ->orderBy('kitchen_submissions.date')
            ->get();
        return response()->json($rows);
    }

    public function costPerCover()
    {
        [$from, $to] = $this->periodRange(request()->query('period', 'month'));
        $rows = KitchenSubmission::query()
            ->select('date', DB::raw('SUM(actual_guests) as guests'))
            ->whereBetween('date', [$from, $to])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($row) {
                $dailyCost = StorePurchase::whereDate('date', $row->date)->sum('total_cost');
                return [
                    'date' => $row->date,
                    'cost_per_cover' => (float) $row->guests > 0 ? round((float) $dailyCost / (float) $row->guests, 2) : 0,
                ];
            });

        return response()->json($rows);
    }

    private function periodRange(string $period): array
    {
        $to = now()->toDateString();
        $from = now()->startOfMonth()->toDateString();

        if ($period === 'today') {
            $from = now()->toDateString();
        } elseif ($period === 'week') {
            $from = now()->startOfWeek()->toDateString();
        } elseif ($period === '6m') {
            $from = now()->subMonths(6)->startOfDay()->toDateString();
        } elseif ($period === 'year') {
            $from = now()->startOfYear()->toDateString();
        }

        return [$from, $to];
    }
}
