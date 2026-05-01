<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DishWasteLog extends Model
{
    protected $fillable = [
        'submission_id',
        'dish_name',
        'quantity_prepped_kg',
        'quantity_line_leftover_kg',
        'quantity_plate_waste_kg',
        'waste_reason',
        'calculated_waste_cost',
    ];

    public function submission()
    {
        return $this->belongsTo(KitchenSubmission::class, 'submission_id');
    }
}
