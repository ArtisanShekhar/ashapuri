<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kitchen_submissions', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->enum('meal_type', ['breakfast', 'lunch', 'dinner']);
            $table->string('submitted_by');
            $table->integer('expected_guests');
            $table->integer('actual_guests');
            $table->boolean('temperature_check_passed')->default(true);
            $table->text('dishes_ran_out')->nullable();
            $table->text('dishes_leftover')->nullable();
            $table->string('portion_observation')->nullable();
            $table->string('biggest_waste_dish')->nullable();
            $table->integer('staff_meals_count')->default(0);
            $table->decimal('staff_meals_qty', 10, 2)->default(0);
            $table->text('quality_issues')->nullable();
            $table->text('went_well')->nullable();
            $table->text('change_tomorrow')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kitchen_submissions');
    }
};
