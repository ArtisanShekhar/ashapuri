<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiInsight;
use App\Models\ChatMessage;
use App\Models\DishWasteLog;
use App\Models\KitchenSubmission;
use App\Models\StorePurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    public function chat(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string'],
        ]);

        ChatMessage::create([
            'user_id' => optional($request->user())->id,
            'role' => 'user',
            'message' => $validated['message'],
        ]);

        $context = $this->contextSnapshot();
        $response = $this->callClaude($validated['message'], $context);

        ChatMessage::create([
            'user_id' => optional($request->user())->id,
            'role' => 'assistant',
            'message' => $response,
        ]);

        AiInsight::create([
            'date' => now()->toDateString(),
            'type' => 'chat',
            'prompt' => $validated['message'],
            'response' => $response,
        ]);

        return response()->json(['response' => $response]);
    }

    public function dailySummary()
    {
        $prompt = 'Generate 3-line daily summary with action items.';
        $response = $this->callClaude($prompt, $this->contextSnapshot());

        $insight = AiInsight::create([
            'date' => now()->toDateString(),
            'type' => 'daily_summary',
            'prompt' => $prompt,
            'response' => $response,
        ]);

        return response()->json($insight);
    }

    public function insights(Request $request)
    {
        $query = AiInsight::query()->orderByDesc('date');
        if ($request->query('from') && $request->query('to')) {
            $query->whereBetween('date', [$request->query('from'), $request->query('to')]);
        }
        return response()->json($query->paginate(30));
    }

    private function contextSnapshot(): array
    {
        return [
            'today_guests' => KitchenSubmission::whereDate('date', now()->toDateString())->sum('actual_guests'),
            'today_waste_kg' => DishWasteLog::join('kitchen_submissions', 'kitchen_submissions.id', '=', 'dish_waste_logs.submission_id')
                ->whereDate('kitchen_submissions.date', now()->toDateString())
                ->selectRaw('SUM(quantity_line_leftover_kg + quantity_plate_waste_kg) as waste')
                ->value('waste') ?? 0,
            'today_cost' => StorePurchase::whereDate('date', now()->toDateString())->sum('total_cost'),
        ];
    }

    private function callClaude(string $userPrompt, array $context): string
    {
        $apiKey = env('ANTHROPIC_API_KEY');
        if (! $apiKey) {
            return "AI fallback: Guests {$context['today_guests']}, Waste ".round((float) $context['today_waste_kg'], 2)."kg, Cost ₹".round((float) $context['today_cost'], 2).". Add ANTHROPIC_API_KEY for Claude responses.";
        }

        $payload = [
            'model' => env('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20240620'),
            'max_tokens' => 400,
            'messages' => [[
                'role' => 'user',
                'content' => "Context: ".json_encode($context)."\nQuestion: {$userPrompt}",
            ]],
        ];

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', $payload);

        if (! $response->ok()) {
            return 'Unable to fetch Claude response right now.';
        }

        $text = data_get($response->json(), 'content.0.text');
        return $text ?: 'Claude returned an empty response.';
    }
}
