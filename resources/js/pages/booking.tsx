import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { booking } from '@/routes';

interface Service {
    id: number;
    name: string;
    price_per_kg: number;
}

const dummyServices: Service[] = [
    { id: 1, name: 'Wash & Fold', price_per_kg: 45.0 },
    { id: 2, name: 'Dry Clean', price_per_kg: 80.0 },
    { id: 3, name: 'Wash & Iron', price_per_kg: 60.0 },
];

export default function Booking() {
    const [serviceId, setServiceId] = useState<number>(dummyServices[0].id);
    const [weightKg, setWeightKg] = useState<string>('');
    const [deliveryRequested, setDeliveryRequested] = useState<boolean>(false);
    const [pickupAddress, setPickupAddress] = useState<string>('');

    const selectedService = dummyServices.find((s) => s.id === Number(serviceId));
    const weight = parseFloat(weightKg) || 0;
    const totalPrice = selectedService ? weight * selectedService.price_per_kg : 0;
    const deliveryFee = deliveryRequested ? 50.0 : 0;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        alert(
            `Booking submitted (stub):\nService: ${selectedService?.name}\nWeight: ${weight}kg\nTotal: ₱${totalPrice.toFixed(
                2,
            )}\nDelivery: ${deliveryRequested ? 'Yes (+₱' + deliveryFee.toFixed(2) + ')' : 'No'}`,
        );
    }

    return (
        <>
            <Head title="Book a Laundry Order" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">

                {/* first box dini dapit para title */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                    <div className="relative z-10 p-6">
                        <h2 className="text-2xl font-bold tracking-tight">Book a Laundry Drop-off</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select a service and enter your laundry weight to get an instant price.
                        </p>
                    </div>
                </div>
                {/* first box code ends  here  */}



                {/* pangalawang kahon */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                    <div className="relative z-10 max-w-xl space-y-6 p-6">
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* gi ai ang drop down kay diak maaram */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Service Type</label>
                                <select
                                    value={serviceId}
                                    onChange={(e) => setServiceId(Number(e.target.value))}
                                    className="border-sidebar-border/70 bg-background w-full rounded-lg border px-3 py-2 text-sm"
                                >
                                    {dummyServices.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} — ₱{s.price_per_kg.toFixed(2)}/kg
                                        </option>
                                    ))}
                                </select>
                            </div>



                            {/* pag input san weight lowkey gi ai gihap */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                    placeholder="e.g. 5.5"
                                    className="border-sidebar-border/70 bg-background w-full rounded-lg border px-3 py-2 text-sm"
                                />
                            </div>

                            {/* alams na gin ano way salbutan sa checkbox bassat sa checkbox ni tas mag spawn ang pickup adress */}
                            <div className="flex items-center gap-2">
                                <input
                                    id="delivery"
                                    type="checkbox"
                                    checked={deliveryRequested}
                                    onChange={(e) => setDeliveryRequested(e.target.checked)}
                                />
                                <label htmlFor="delivery" className="text-sm font-medium">
                                    Request pickup/delivery (+₱50.00)
                                </label>
                            </div>

                            {/* amo ni an mag  spawn pag pinindut mo yung checkbox */}
                            {deliveryRequested && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Pickup Address</label>
                                    <input
                                        type="text"
                                        value={pickupAddress}
                                        onChange={(e) => setPickupAddress(e.target.value)}
                                        placeholder="House no., street, barangay"
                                        className="border-sidebar-border/70 bg-background w-full rounded-lg border px-3 py-2 text-sm"
                                    />
                                </div>
                            )}

                            {/* gamay na box sulod sa 2nd box */}
                            <div className="border-sidebar-border/70 bg-muted/40 rounded-lg border p-4">
                                <div className="flex justify-between text-sm">
                                    <span>Laundry cost</span>
                                    <span>₱{totalPrice.toFixed(2)}</span>
                                </div>
                                {deliveryRequested && (
                                    <div className="flex justify-between text-sm">
                                        <span>Delivery fee</span>
                                        <span>₱{deliveryFee.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-sidebar-border/70 mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span>₱{(totalPrice + deliveryFee).toFixed(2)}</span>
                                </div>
                            </div>
                            {/* end code sa gamy na box cute yarn */}

                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground w-full rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
                            >
                                Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
                {/* end code san 2nd box */}


                {/* 4th box  */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                <div className="relative z-10 max-w-xl space-y-6 p-6">



                </div>

                </div>

            </div>
        </>
    );
}

Booking.layout = {
    breadcrumbs: [
        {
            title: 'Booking',
            href: booking(),
        },
    ],
};