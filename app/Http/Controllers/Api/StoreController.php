<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StorePurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoreController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'vendor_name' => ['required', 'string'],
            'item_name' => ['required', 'string'],
            'item_category' => ['required', 'string'],
            'quantity' => ['required', 'numeric'],
            'unit' => ['required', 'string'],
            'cost_per_unit' => ['required', 'numeric'],
            'market_rate' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
            'issued_to_kitchen_qty' => ['nullable', 'numeric'],
        ]);

        $validated['total_cost'] = $validated['quantity'] * $validated['cost_per_unit'];
        $purchase = StorePurchase::create($validated);

        return response()->json($purchase, 201);
    }

    public function index(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = StorePurchase::query()->orderByDesc('date');
        if ($from && $to) {
            $query->whereBetween('date', [$from, $to]);
        }

        return response()->json($query->paginate(50));
    }

    public function vendorAnalysis(Request $request)
    {
        $period = $request->query('period', 'month');
        [$from, $to] = $this->periodRange($period);

        $rows = StorePurchase::query()
            ->select(
                'item_name',
                DB::raw('SUM(COALESCE(issued_to_kitchen_qty, quantity)) as qty_used'),
                DB::raw('AVG(cost_per_unit) as cost_per_unit'),
                DB::raw('AVG(COALESCE(market_rate, cost_per_unit)) as market_rate')
            )
            ->whereBetween('date', [$from, $to])
            ->groupBy('item_name')
            ->get()
            ->map(function ($row) {
                $overpayPerUnit = max(0, (float) $row->cost_per_unit - (float) $row->market_rate);
                $monthlyLoss = $overpayPerUnit * (float) $row->qty_used;
                return [
                    'item' => $row->item_name,
                    'qty_used' => round((float) $row->qty_used, 2),
                    'cost_per_unit' => round((float) $row->cost_per_unit, 2),
                    'market_rate' => round((float) $row->market_rate, 2),
                    'overpay_per_unit' => round($overpayPerUnit, 2),
                    'monthly_loss' => round($monthlyLoss, 2),
                    'action' => $monthlyLoss > 1000 ? 'Switch/Negotiate' : 'OK',
                ];
            });

        return response()->json($rows);
    }

    public function priceAlerts()
    {
        $alerts = StorePurchase::query()
            ->orderByDesc('date')
            ->get()
            ->filter(function ($purchase) {
                $avg = StorePurchase::query()
                    ->where('item_name', $purchase->item_name)
                    ->whereDate('date', '>=', now()->subDays(30)->toDateString())
                    ->avg('cost_per_unit');
                return $avg && (float) $purchase->cost_per_unit > (1.10 * (float) $avg);
            })
            ->take(20)
            ->map(function ($purchase) {
                $avg = StorePurchase::query()
                    ->where('item_name', $purchase->item_name)
                    ->whereDate('date', '>=', now()->subDays(30)->toDateString())
                    ->avg('cost_per_unit');

                return [
                    'item_name' => $purchase->item_name,
                    'today_rate' => (float) $purchase->cost_per_unit,
                    'average_30_day' => round((float) $avg, 2),
                    'increase_percent' => round((((float) $purchase->cost_per_unit - (float) $avg) / (float) $avg) * 100, 2),
                    'message' => "{$purchase->item_name} price jumped above 10%. Investigate before paying.",
                ];
            })->values();

        return response()->json($alerts);
    }

    private function periodRange(string $period): array
    {
        $to = now()->toDateString();
        $from = now()->startOfMonth()->toDateString();

        if ($period === 'today') {
            $from = now()->toDateString();
        } elseif ($period === 'week') {
            $from = now()->startOfWeek()->toDateString();
        } elseif ($period === '6m') {
            $from = now()->subMonths(6)->startOfDay()->toDateString();
        } elseif ($period === 'year') {
            $from = now()->startOfYear()->toDateString();
        }

        return [$from, $to];
    }
}
