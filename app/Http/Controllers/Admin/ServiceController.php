<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceRequest;
use App\Models\Service;
use Inertia\Inertia;

class ServiceController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Services', ['services' => Service::all()]);
    }

    public function store(ServiceRequest $request)
    {
        Service::create($request->validated());

        return back();
    }

       public function update(ServiceRequest $request, Service $service)
    {
        $service->update($request->validated());

        return back();
    }

    public function destroy(Service $service)
    {
        $service->delete();

        return back();
    }
    
}