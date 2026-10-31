<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrderIntakeTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        return User::factory()->create(['role' => 'staff']);
    }

    private function order(User $owner, string $status = 'Pending'): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return Order::create([
            'user_id' => $owner->id,
            'service_id' => $service->id,
            'quantity' => 2,
            'total' => 90,
            'status' => $status,
            'fulfillment' => Order::DROPOFF,
            'payment_method' => Order::CASH,
            'payment_status' => Order::UNPAID,
        ]);
    }

    public function test_staff_can_record_what_was_received(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);
        $staff = $this->staff();

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 8,
            'notes' => '2 white shirts, one with a collar stain',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('order_intakes', [
            'order_id' => $order->id,
            'item_count' => 8,
            'notes' => '2 white shirts, one with a collar stain',
            'received_by' => $staff->id,
        ]);
        $this->assertDatabaseHas('activity_logs', ['event' => 'order.intake', 'order_id' => $order->id]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $customer->id]);
    }

    public function test_recording_again_updates_the_same_record(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);
        $staff = $this->staff();

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 8]);
        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 9, 'notes' => 'Found one more sock']);

        $this->assertSame(1, $order->intake()->count());
        $this->assertSame(9, $order->fresh()->intake->item_count);
        $this->assertSame('Found one more sock', $order->fresh()->intake->notes);
        // the customer is told about the first record and about the corrected count
        $this->assertSame(2, $customer->notifications()->count());
    }

    public function test_a_corrected_note_alone_does_not_bother_the_customer(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);
        $staff = $this->staff();

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 8]);
        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 8, 'notes' => 'Typo fixed']);

        $this->assertSame(1, $customer->notifications()->count());
    }

    public function test_bad_item_counts_are_refused(): void
    {
        $order = $this->order(User::factory()->create());
        $staff = $this->staff();

        foreach ([0, -1, 501, 'abc', 1.5, ''] as $bad) {
            $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => $bad])
                ->assertSessionHasErrors('item_count');
        }

        $this->assertSame(0, $order->intake()->count());
    }

    public function test_finished_orders_cannot_be_changed(): void
    {
        $staff = $this->staff();
        $done = $this->order(User::factory()->create(), Order::CLAIMED);
        $gone = $this->order(User::factory()->create(), Order::CANCELLED);

        $this->actingAs($staff)->post("/admin/orders/{$done->id}/intake", ['item_count' => 3])->assertSessionHasErrors('item_count');
        $this->actingAs($staff)->post("/admin/orders/{$gone->id}/intake", ['item_count' => 3])->assertSessionHasErrors('item_count');

        $this->assertSame(0, \App\Models\OrderIntake::count());
    }

    public function test_customers_cannot_record_intake(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);

        $this->actingAs($customer)->post("/admin/orders/{$order->id}/intake", ['item_count' => 3])->assertForbidden();

        $this->assertSame(0, $order->intake()->count());
    }

    public function test_the_counter_photo_is_private_to_the_owner_and_the_shop(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $order = $this->order($owner);
        $staff = $this->staff();

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 4,
            'photo' => UploadedFile::fake()->image('bag.jpg', 600, 400),
        ])->assertSessionHasNoErrors();

        $url = "/orders/{$order->id}/intake-photo";

        $this->actingAs($owner)->get($url)->assertOk();
        $this->actingAs($staff)->get($url)->assertOk();
        $this->actingAs($stranger)->get($url)->assertNotFound();
    }

    public function test_a_new_photo_replaces_the_old_file_and_remove_deletes_it(): void
    {
        Storage::fake('local');
        $order = $this->order(User::factory()->create());
        $staff = $this->staff();

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 4,
            'photo' => UploadedFile::fake()->image('one.jpg', 600, 400),
        ]);
        $first = $order->fresh()->intake->photo;
        Storage::disk('local')->assertExists($first);

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 4,
            'photo' => UploadedFile::fake()->image('two.jpg', 600, 400),
        ]);
        $second = $order->fresh()->intake->photo;
        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 4, 'remove_photo' => 1]);
        $this->assertNull($order->fresh()->intake->photo);
        Storage::disk('local')->assertMissing($second);
    }

    public function test_a_non_image_is_refused_as_a_photo(): void
    {
        Storage::fake('local');
        $order = $this->order(User::factory()->create());

        $this->actingAs($this->staff())->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 4,
            'photo' => UploadedFile::fake()->create('notes.pdf', 50, 'application/pdf'),
        ])->assertSessionHasErrors('photo');

        $this->assertSame(0, $order->intake()->count());
    }

    public function test_the_customer_sees_the_count_and_notes_but_not_the_storage_path(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $order = $this->order($owner);

        $this->actingAs($this->staff())->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 6,
            'notes' => 'All good',
            'photo' => UploadedFile::fake()->image('bag.jpg', 600, 400),
        ]);

        $this->actingAs($owner)->get('/orders')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.0.intake.item_count', 6)
                ->where('orders.0.intake.notes', 'All good')
                ->where('orders.0.intake.photo_url', url("/orders/{$order->id}/intake-photo"))
                ->missing('orders.0.intake.photo'));
    }

    public function test_the_receipt_shows_how_many_items_were_received(): void
    {
        $owner = User::factory()->create();
        $order = $this->order($owner);

        $this->actingAs($owner)->get("/orders/{$order->id}/receipt")
            ->assertInertia(fn (Assert $page) => $page->where('order.items_received', null));

        $this->actingAs($this->staff())->post("/admin/orders/{$order->id}/intake", ['item_count' => 7]);

        $this->actingAs($owner)->get("/orders/{$order->id}/receipt")
            ->assertInertia(fn (Assert $page) => $page->where('order.items_received', 7));
    }

    public function test_the_admin_desk_carries_the_intake_record(): void
    {
        $order = $this->order(User::factory()->create());
        $staff = $this->staff();

        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 3]);

        $this->actingAs($staff)->get('/admin')
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.0.intake.item_count', 3)
                ->where('orders.0.intake.received_by_name', $staff->name)
                ->missing('orders.0.intake.receiver'));
    }

    public function test_deleting_an_order_removes_its_counter_photo_file(): void
    {
        Storage::fake('local');
        $order = $this->order(User::factory()->create());

        $this->actingAs($this->staff())->post("/admin/orders/{$order->id}/intake", [
            'item_count' => 2,
            'photo' => UploadedFile::fake()->image('bag.jpg', 600, 400),
        ]);
        $path = $order->fresh()->intake->photo;
        Storage::disk('local')->assertExists($path);

        $order->fresh()->delete();

        Storage::disk('local')->assertMissing($path);
    }
}
