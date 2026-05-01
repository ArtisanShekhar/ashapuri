<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'gm@ashapurivillage.in'],
            [
                'name' => 'Ashapuri GM',
                'role' => 'Admin/GM',
                'password' => Hash::make('password123'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'store@ashapurivillage.in'],
            [
                'name' => 'Ashapuri Store',
                'role' => 'Store',
                'password' => Hash::make('password123'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'kitchen@ashapurivillage.in'],
            [
                'name' => 'Ashapuri Kitchen',
                'role' => 'Kitchen',
                'password' => Hash::make('password123'),
            ]
        );

        $this->call(PhaseOneOpsSeeder::class);
    }
}
