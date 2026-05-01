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
        Schema::create('dish_waste_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('kitchen_submissions')->cascadeOnDelete();
            $table->string('dish_name');
            $table->decimal('quantity_prepped_kg', 10, 2);
            $table->decimal('quantity_line_leftover_kg', 10, 2);
            $table->decimal('quantity_plate_waste_kg', 10, 2);
            $table->string('waste_reason');
            $table->decimal('calculated_waste_cost', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dish_waste_logs');
    }
};
