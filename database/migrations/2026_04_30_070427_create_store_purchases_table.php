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
        Schema::create('store_purchases', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('vendor_name');
            $table->string('item_name');
            $table->string('item_category');
            $table->decimal('quantity', 10, 2);
            $table->string('unit');
            $table->decimal('cost_per_unit', 10, 2);
            $table->decimal('total_cost', 12, 2);
            $table->decimal('market_rate', 10, 2)->nullable();
            $table->decimal('issued_to_kitchen_qty', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_purchases');
    }
};
