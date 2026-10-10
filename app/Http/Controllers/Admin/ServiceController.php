<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceRequest;
use App\Models\Service;
use App\Support\Activity;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Services', ['services' => Service::all()]);
    }

    public function store(ServiceRequest $request): RedirectResponse
    {
        $service = Service::create($request->validated());
        Activity::log('service.created', "Service added: {$service->name} (".Activity::money($service->price).')');

        return back();
    }

    public function update(ServiceRequest $request, Service $service): RedirectResponse
    {
        $service->update($request->validated());
        Activity::log('service.updated', "Service updated: {$service->name} (".Activity::money($service->price).')');

        return back();
    }

    public function destroy(Service $service): RedirectResponse
    {
        Activity::log('service.deleted', "Service removed: {$service->name}");
        $service->delete();

        return back();
    }
}
