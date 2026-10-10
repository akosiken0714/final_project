import { Head } from '@inertiajs/react';
import { booking } from '@/routes';

export default function Booking() {
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
                {/* first box code ends here */}

                {/* pangalawang kahon */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                    <div className="relative z-10 max-w-xl space-y-6 p-6">
                        <form className="space-y-5">

                            {/*  */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Service Type</label>
                                <select className="border-sidebar-border/70 bg-background w-full rounded-lg border px-3 py-2 text-sm">
                                    <option>Wash & Fold — ₱45.00/kg</option>
                                    <option>Dry Clean — ₱80.00/kg</option>
                                    <option>Wash & Iron — ₱60.00/kg</option>
                                </select>
                            </div>

                            {/* pag input san weight lowkey gi ai gihap */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Weight (kg)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 5.5"
                                    className="border-sidebar-border/70 bg-background w-full rounded-lg border px-3 py-2 text-sm"
                                />
                            </div>

                            {/* alams na gin ano way salbutan sa checkbox bassat sa checkbox ni tas mag spawn ang pickup adress */}
                            <div className="flex items-center gap-2">
                                <input id="delivery" type="checkbox" />
                                <label htmlFor="delivery" className="text-sm font-medium">
                                    Request pickup/delivery (+₱50.00)
                                </label>
                            </div>

                            {/* mas magana  kung magawas la ini  kung pinduton ang  checkbox */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Pickup Address</label>
                                <input
                                    type="text"
                                    placeholder="House no., street, barangay"
                                    className="border-sidebar-border/70 bg-background w-full rounded-lg border px-3 py-2 text-sm"
                                />
                            </div>

                            {/* gamay na box sulod sa 2nd box */}
                            <div className="border-sidebar-border/70 bg-muted/40 rounded-lg border p-4">
                                <div className="flex justify-between text-sm">
                                    <span>Laundry cost</span>
                                    <span>₱0.00</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Delivery fee</span>
                                    <span>₱0.00</span>
                                </div>
                                <div className="border-sidebar-border/70 mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span>₱0.00</span>
                                </div>
                            </div>
                            {/* end code sa gamy na box cute yarn */}

                            <button
                                type="button"
                                className="bg-primary text-primary-foreground w-full rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
                            >
                                Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
                {/* end code san 2nd box */}

                {/* 3rd box */}
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