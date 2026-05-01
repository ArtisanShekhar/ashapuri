<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StorePurchase extends Model
{
    protected $fillable = [
        'date',
        'vendor_name',
        'item_name',
        'item_category',
        'quantity',
        'unit',
        'cost_per_unit',
        'total_cost',
        'market_rate',
        'issued_to_kitchen_qty',
        'notes',
    ];
}
