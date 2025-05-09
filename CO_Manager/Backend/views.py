from django.shortcuts import render

# Create your views here.

def dashboard(request):
    return render(request, 'dashboard.html', {})

def orders(request):
    return render(request, 'orders.html', {})

def rollback(request):
    return render(request, 'rollback.html', {})

def purchase(request):
    return render(request, 'purchase.html', {})

def wo_ledger(request):
    return render(request, 'wo_management.html', {})

def ctc_ledger(request):
    return render(request, 'ctc_management.html', {})

def user_management(request):
    return render(request, 'user_management.html', {})
