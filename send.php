<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Telegram credentials belong on the server only.
// Replace these placeholders on hosting before going live.
$botToken = 'PASTE_BOT_TOKEN_HERE';
$chatId = 'PASTE_CHAT_ID_HERE';

$rawBody = file_get_contents('php://input') ?: '';
$data = json_decode($rawBody, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON'], JSON_UNESCAPED_UNICODE);
    exit;
}

function field(array $data, string $key, string $fallback = 'Не указано'): string
{
    $value = $data[$key] ?? '';
    if (is_array($value)) {
        $value = json_encode($value, JSON_UNESCAPED_UNICODE);
    }
    $value = trim((string) $value);
    return $value !== '' ? $value : $fallback;
}

function has_enough_phone_digits(string $phone): bool
{
    return strlen(preg_replace('/\D+/', '', $phone)) >= 12;
}

$phone = field($data, 'phone', '');
$demolitionType = field($data, 'demolitionType', '');

if ($phone === '' || !has_enough_phone_digits($phone)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Phone is required'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($demolitionType === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Demolition type is required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$utm = $data['utm'] ?? [];
$utmText = 'Не указаны';
if (is_array($utm) && count($utm) > 0) {
    $utmPairs = [];
    foreach ($utm as $key => $value) {
        $utmPairs[] = $key . '=' . $value;
    }
    $utmText = implode(', ', $utmPairs);
}

$text = implode("\n", [
    'Новая заявка с сайта "Демонтаж"',
    'Телефон: ' . $phone,
    'Имя: ' . field($data, 'name'),
    'Что нужно демонтировать: ' . $demolitionType,
    'Где находится объект: ' . field($data, 'location'),
    'Нужен ли вывоз мусора: ' . field($data, 'trashRemoval'),
    'Когда нужно выполнить работы: ' . field($data, 'deadline'),
    'Удобный способ связи: ' . field($data, 'contactMethod'),
    'Страница/источник: ' . field($data, 'page'),
    'UTM-метки: ' . $utmText,
    'Дата и время заявки: ' . field($data, 'requestedAt', date('d.m.Y H:i:s')),
]);

if ($botToken === 'PASTE_BOT_TOKEN_HERE' || $chatId === 'PASTE_CHAT_ID_HERE') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Telegram credentials are not configured'], JSON_UNESCAPED_UNICODE);
    exit;
}

$telegramUrl = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
$payload = http_build_query([
    'chat_id' => $chatId,
    'text' => $text,
    'disable_web_page_preview' => 'true',
]);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $payload,
        'timeout' => 10,
    ],
]);

$response = @file_get_contents($telegramUrl, false, $context);
$telegramResponse = is_string($response) ? json_decode($response, true) : null;

if (!is_array($telegramResponse) || ($telegramResponse['ok'] ?? false) !== true) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Telegram request failed'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
