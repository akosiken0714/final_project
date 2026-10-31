<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A customer's star rating (1 to 5) and optional comment for one finished order.
class OrderRating extends Model
{
    public const MAX_COMMENT = 500;

    protected $fillable = ['order_id', 'user_id', 'stars', 'comment', 'demo'];

    protected $casts = ['stars' => 'integer', 'demo' => 'boolean'];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
