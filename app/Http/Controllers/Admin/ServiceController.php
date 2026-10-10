<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceRequest;
use App\Models\Service;
use App\Support\Activity;
use Inertia\Inertia;

class ServiceController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Services', ['services' => Service::all()]);
    }

    public function store(ServiceRequest $request)
    {
        $service = Service::create($request->validated());
        Activity::log('service.created', "Service added: {$service->name} (".Activity::money($service->price).')');

        return back();
    }

    public function update(ServiceRequest $request, Service $service)
    {
        $service->update($request->validated());
        Activity::log('service.updated', "Service updated: {$service->name} (".Activity::money($service->price).')');

        return back();
    }

    public function destroy(Service $service)
    {
        Activity::log('service.deleted', "Service removed: {$service->name}");
        $service->delete();

        return back();
    }
}
