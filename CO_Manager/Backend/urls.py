from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="index"),
    
    path('orders/', views.orders, name='orders'),
    path('orders/<str:pk>/', views.orders_detail, name='orders_detail'),
    path('orders/<str:pk>/export/', views.orders_export_original, name='orders_export_original'),
    path('orders/sync-cloudify', views.orders_sync_cloudify, name='orders_sync_cloudify'),

    # Blending Ratios URLs
    path('blendingratios/', views.blending_ratios, name='blending_ratios'),
    path('blendingratios/<int:pk>/', views.blending_ratios_detail, name='blending_ratios_detail'),
    path('blendingratios/create/', views.blending_ratios_create, name='blending_ratios_create'),

    # API URLs for blending ratios
    path('api/blendingratios/update_or_create/<int:pk>/', views.blending_ratios_update_or_create, name='api_blending_ratios_update_or_create'),
    path('api/blendingratios/get_order_data_for_create/', views.blending_ratios_get_order_data_for_create, name='api_blending_ratios_get_order_data_for_create'),
    path('api/blendingratios/delete/<int:pk>/', views.blending_ratios_delete, name='api_blending_ratios_delete'),
    path('api/blendingratios/export/<int:pk>/', views.blending_ratios_export, name='api_blending_ratios_export'),

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

    # Phụ lục X URLs
    path('phu_luc_x/', views.phu_luc_x, name='phu_luc_x'),

    # API Phụ lục X URLs
    path('api/phu_luc_x/get_purchase_data_for_create/', views.get_purchase_data_for_create, name='get_purchase_data_for_create'),
    path('api/phu_luc_x/create/', views.phu_luc_x_create, name='api_phu_luc_x_create'),
    path('api/phu_luc_x/delete/<int:pk>/', views.phu_luc_x_delete, name='api_phu_luc_x_delete'),
    path('api/phu_luc_x/update/<int:pk>/', views.phu_luc_x_update, name='api_phu_luc_x_update'),
    path('api/phu_luc_x/export/<int:pk>/', views.phu_luc_x_export, name='api_phu_luc_x_update'),

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

    # API CTC URLs
    path('api/get_data_for_ctc_create/', views.get_data_for_ctc_create, name='get_data_for_ctc_create'),
    path("api/ctc/create/", views.ctc_create, name="ctc_create"),
    path("api/ctc/<str:pk>/update/", views.ctc_update, name="ctc_update"),
    path("api/ctc/<str:pk>/delete/", views.ctc_delete, name="ctc_delete"),
    
    # PURCHASE URLs
    path('purchase/', views.purchase, name='purchase'),
    path('purchase/<int:pk>/', views.purchase_detail, name='purchase_detail'),
    path('purchase/create/', views.purchase_create, name='purchase_create'),
    path('api/purchase/delete/<int:pk>/', views.purchase_delete, name='purchase_delete'),
    path('api/purchase/lenh_sx_by_don_hang/<str:ma_don_hang>/', views.get_lenh_sx_by_don_hang, name='get_lenh_sx_by_don_hang'),
    path('api/purchase/materials/<str:ma_lenh_sx>/', views.get_purchase_materials_by_lenh_sx_api, name='get_purchase_materials_api'),
    path('api/nguoi/list/', views.get_nguoi_list, name='get_nguoi_list'),
    path('api/nguoi/detail/', views.get_nguoi_detail, name='get_nguoi_detail'),
    path('api/nguoi/add/', views.add_nguoi, name='add_nguoi'),
    path('purchase/<int:pk>/export-pdf/', views.purchase_export_pdf, name='purchase_export_pdf'),
    path('purchase/<int:pk>/export-excel/', views.purchase_export_excel, name='purchase_export_excel'),
    path('api/purchase/non-invoice-materials/', views.api_purchase_non_invoice_materials, name='api_purchase_non_invoice_materials'),
    path('purchase/export-non-invoice/', views.purchase_export_non_invoice, name='purchase_export_non_invoice'),

    # WO URLs
    path("wo/", views.wo_ledger, name="wo_ledger"),
    path("wo/<int:pk>/", views.wo_ledger_detail, name="wo_ledger_detail"), 
    #path("wo/create/", views.create_wo_record, name="wo_create"),
    # WO API URLs
    path("api/wo/delete/<int:pk>/", views.delete_wo_record, name="wo_delete"),
    # path("api/get_lenh_san_xuat_wo/", views.get_lenh_san_xuat_for_wo, name="get_lenh_san_xuat_wo"),
    # path("api/get_lenh_sx_by_don_hang_wo/<str:ma_don_hang>/", views.get_lenh_sx_by_don_hang_wo, name="get_lenh_sx_by_don_hang_wo"),
    # path("api/get_purchase_records_by_lenh_sx_wo/<str:ma_lenh_sx>/", views.get_purchase_records_by_lenh_sx_wo, name="get_purchase_records_by_lenh_sx_wo"),
    # path("api/wo/purchase_details/<int:purchase_id>/", views.get_purchase_details_wo, name="get_purchase_details_wo"),
    path("wo/<int:pk>/export/pdf/", views.wo_export_pdf, name="wo_export_pdf"),
    path("wo/<int:pk>/export/word/", views.wo_export_word, name="wo_export_word"),  
    path('wo/<int:pk>/get-similar-materials/', views.get_similar_materials, name='get_similar_materials'),
    path('wo/export-multiple/', views.export_multiple_wo, name='export_multiple_wo'),
]