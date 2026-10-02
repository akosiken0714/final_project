<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Order extends Model
{
    const STATUSES = ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'];

    protected $fillable = ['user_id', 'service_id', 'quantity', 'total', 'instructions', 'address', 'photo', 'status'];

    protected $appends = ['photo_url'];

    protected static function booted(): void
    {
    static::deleting(fn (Order $order) => $order->deletePhotoFiles());
    }

    // Removes the photo from every disk it could be on.
    public function deletePhotoFiles(): void
    {
    if (! $this->photo) {
        return;
    }

    foreach (['local', 'public'] as $disk) {
        Storage::disk($disk)->delete($this->photo);
    }
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function service()
    {
    return $this->belongsTo(Service::class)->withTrashed();
    }   

    public function getPhotoUrlAttribute()
    {
        return $this->photo ? url("/orders/{$this->id}/photo") : null;
    }
}