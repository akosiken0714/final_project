<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    const UPDATED_AT = null; // the table only has created_at

    protected $fillable = ['user_id', 'order_id', 'event', 'summary', 'meta'];

    protected $casts = ['meta' => 'array'];

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
