<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\BusinessReport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// The printable "Business report": one clear page the owner can read, print or save as a PDF.
// It only READS data, so opening or printing it can never change an order.
class ReportController extends Controller
{
    public function show(Request $request): Response
    {
        $report = (new BusinessReport)->build($this->text($request, 'period', '30'));

        return Inertia::render('Admin/Report', $report + [
            'preparedBy' => $request->user()->name,
        ]);
    }
}
