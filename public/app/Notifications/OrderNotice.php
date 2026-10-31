<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

// A small in-app message shown in the bell. No email or SMS on purpose (free, nothing to configure).
class OrderNotice extends Notification
{
    public function __construct(
        public string $title,
        public string $body,
        public string $url,
        public ?int $orderId = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return ['title' => $this->title, 'body' => $this->body, 'url' => $this->url, 'order_id' => $this->orderId];
    }
}
