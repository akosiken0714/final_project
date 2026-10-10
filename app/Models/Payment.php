<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = ['order_id', 'user_id', 'method', 'driver', 'amount', 'status', 'reference', 'masked_number', 'failure_reason'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
