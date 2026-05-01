<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DishWasteLog;
use App\Models\KitchenSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KitchenController extends Controller
{
    private function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'meal_type' => ['required', 'in:breakfast,lunch,dinner'],
            'submitted_by' => ['required', 'string'],
            'expected_guests' => ['required', 'integer'],
            'actual_guests' => ['required', 'integer'],
            'temperature_check_passed' => ['required', 'boolean'],
            'dishes_ran_out' => ['nullable', 'string'],
            'dishes_leftover' => ['nullable', 'string'],
            'portion_observation' => ['nullable', 'string'],
            'biggest_waste_dish' => ['nullable', 'string'],
            'staff_meals_count' => ['nullable', 'integer'],
            'staff_meals_qty' => ['nullable', 'numeric'],
            'quality_issues' => ['nullable', 'string'],
            'went_well' => ['nullable', 'string'],
            'change_tomorrow' => ['nullable', 'string'],
            'dish_waste_rows' => ['required', 'array', 'min:1'],
            'dish_waste_rows.*.dish_name' => ['required', 'string'],
            'dish_waste_rows.*.quantity_prepped_kg' => ['required', 'numeric', 'min:0'],
            'dish_waste_rows.*.quantity_line_leftover_kg' => ['required', 'numeric', 'min:0'],
            'dish_waste_rows.*.quantity_plate_waste_kg' => ['required', 'numeric', 'min:0'],
            'dish_waste_rows.*.waste_reason' => ['required', 'string'],
        ];
    }

    private function messages(): array
    {
        return [
            'dish_waste_rows.*.dish_name.required' => 'Dish name field is required.',
            'dish_waste_rows.*.quantity_prepped_kg.required' => 'Prepped quantity field is required.',
            'dish_waste_rows.*.quantity_line_leftover_kg.required' => 'Line leftover quantity field is required.',
            'dish_waste_rows.*.quantity_plate_waste_kg.required' => 'Plate waste quantity field is required.',
            'dish_waste_rows.*.waste_reason.required' => 'Waste reason field is required.',
        ];
    }

    private function persistDishRows(KitchenSubmission $submission, array $rows): void
    {
        DishWasteLog::query()->where('submission_id', $submission->id)->delete();
        foreach ($rows as $row) {
            DishWasteLog::create([
                'submission_id' => $submission->id,
                'dish_name' => $row['dish_name'],
                'quantity_prepped_kg' => $row['quantity_prepped_kg'],
                'quantity_line_leftover_kg' => $row['quantity_line_leftover_kg'],
                'quantity_plate_waste_kg' => $row['quantity_plate_waste_kg'],
                'waste_reason' => $row['waste_reason'],
                'calculated_waste_cost' => $row['calculated_waste_cost'] ?? 0,
            ]);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules(), $this->messages());

        $validated['staff_meals_count'] = $validated['staff_meals_count'] ?? 0;
        $validated['staff_meals_qty'] = $validated['staff_meals_qty'] ?? 0;

        $submission = DB::transaction(function () use ($validated) {
            $created = KitchenSubmission::create($validated);
            $this->persistDishRows($created, $validated['dish_waste_rows']);
            return $created;
        });

        return response()->json($submission->load('dishWasteLogs'), 201);
    }

    public function index(Request $request)
    {
        $search = trim((string) $request->query('q', ''));
        $sortBy = $request->query('sort_by', 'date');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = min(max((int) $request->query('per_page', 10), 1), 100);
        $allowedSort = ['date', 'meal_type', 'submitted_by', 'expected_guests', 'actual_guests', 'created_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'date';
        }

        $query = KitchenSubmission::query()->with('dishWasteLogs')->orderBy($sortBy, $sortDir);
        if ($request->query('from') && $request->query('to')) {
            $query->whereBetween('date', [$request->query('from'), $request->query('to')]);
        }
        if ($request->query('meal')) {
            $query->where('meal_type', $request->query('meal'));
        }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('submitted_by', 'like', "%{$search}%")
                    ->orWhere('meal_type', 'like', "%{$search}%")
                    ->orWhere('date', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($perPage));
    }

    public function update(Request $request, KitchenSubmission $submission)
    {
        $validated = $request->validate($this->rules(), $this->messages());
        $validated['staff_meals_count'] = $validated['staff_meals_count'] ?? 0;
        $validated['staff_meals_qty'] = $validated['staff_meals_qty'] ?? 0;

        $updated = DB::transaction(function () use ($submission, $validated) {
            $submission->update($validated);
            $this->persistDishRows($submission, $validated['dish_waste_rows']);
            return $submission->fresh();
        });

        return response()->json($updated->load('dishWasteLogs'));
    }

    public function destroy(KitchenSubmission $submission)
    {
        DB::transaction(function () use ($submission) {
            DishWasteLog::query()->where('submission_id', $submission->id)->delete();
            $submission->delete();
        });
        return response()->json(['message' => 'Kitchen record deleted successfully.']);
    }
}
