<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DishWasteLog;
use App\Models\KitchenSubmission;
use Illuminate\Http\Request;

class KitchenController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
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
        ]);

        $submission = KitchenSubmission::create($validated);

        foreach ($validated['dish_waste_rows'] as $row) {
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

        return response()->json($submission->load('dishWasteLogs'), 201);
    }

    public function index(Request $request)
    {
        $query = KitchenSubmission::query()->with('dishWasteLogs')->orderByDesc('date');
        if ($request->query('from') && $request->query('to')) {
            $query->whereBetween('date', [$request->query('from'), $request->query('to')]);
        }
        if ($request->query('meal')) {
            $query->where('meal_type', $request->query('meal'));
        }

        return response()->json($query->paginate(30));
    }
}
