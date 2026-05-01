<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KitchenSubmission extends Model
{
    protected $fillable = [
        'date',
        'meal_type',
        'submitted_by',
        'expected_guests',
        'actual_guests',
        'temperature_check_passed',
        'dishes_ran_out',
        'dishes_leftover',
        'portion_observation',
        'biggest_waste_dish',
        'staff_meals_count',
        'staff_meals_qty',
        'quality_issues',
        'went_well',
        'change_tomorrow',
    ];

    public function dishWasteLogs()
    {
        return $this->hasMany(DishWasteLog::class, 'submission_id');
    }
}
