<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiInsight extends Model
{
    protected $fillable = [
        'date',
        'type',
        'prompt',
        'response',
    ];
}
