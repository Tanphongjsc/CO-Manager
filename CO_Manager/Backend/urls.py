from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="index"),
    
    path('orders/', views.orders, name='orders'),
    path('orders/<str:pk>/', views.orders_detail, name='orders_detail'),
    path('orders/<str:pk>/export/', views.orders_export, name='orders_export'),
    path('orders/sync-cloudify', views.orders_sync_cloudify, name='orders_sync_cloudify'),

    path("purchase/", views.purchase, name="purchase"),
    path("wo/", views.wo_ledger, name="wo_ledger"),

    path("ctc/", views.ctc_ledger, name="ctc_ledger"),
    path("ctc/<str:pk>/", views.ctc_detail, name="ctc_detail"),
    path("ctc/<str:pk>/export/", views.ctc_export, name="ctc_export"),

    path('users/', views.users_management, name='users'),
    path('users/create/', views.users_create, name='create_user'),
    path('users/update/', views.users_update, name='update_user'),
    path('users/delete/', views.users_delete, name='delete_user'),

    path('products/', views.product_management, name='products'),
    path('products/update/', views.product_update, name='update_product'),
    path('products/delete/', views.product_delete, name='delete_product'),
    path('products/sync-cloudify/', views.products_sync_cloudify, name='products_sync_cloudify'),

    # Rollback URLs
    path('rollback/', views.rollback, name='rollback'),
    path('rollback/create/', views.rollback_create, name='rollback_create'),
    path('rollback/<int:pk>/', views.rollback_detail, name='rollback_detail'),
    path('api/rollback/update/<int:pk>/', views.rollback_update, name='rollback_update_api'),
    path('rollback/<int:pk>/export/pdf/', views.rollback_export_pdf, name='rollback_export_pdf'),
    path('rollback/<int:pk>/export/excel/', views.rollback_export_excel, name='rollback_export_excel'),
    
    # API URLs
    path('api/get_lenh_san_xuat/', views.get_lenh_san_xuat, name='get_lenh_san_xuat'),
    path('api/get_lenh_san_xuat_all/', views.get_lenh_san_xuat_all, name='get_lenh_san_xuat_all'),
    path('api/get_lenh_san_xuat_detail/', views.get_lenh_san_xuat_detail, name='get_lenh_san_xuat_detail'),
    path('api/check_rollback_exist/', views.check_rollback_exist, name='check_rollback_exist'),
    path('api/rollback/delete/<int:pk>/', views.rollback_delete, name='rollback_delete'),

    path('api/get_data_for_ctc_create/', views.get_data_for_ctc_create, name='get_data_for_ctc_create'),
    path("api/ctc/create/", views.ctc_create, name="ctc_create"),
    path("api/ctc/<str:pk>/update/", views.ctc_update, name="ctc_update"),
    path("api/ctc/<str:pk>/delete/", views.ctc_delete, name="ctc_delete"),
    
]