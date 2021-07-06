# -*- coding: utf-8 -*-
from odoo import http

# class Waytosen(http.Controller):
#     @http.route('/waytosen/waytosen/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/waytosen/waytosen/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('waytosen.listing', {
#             'root': '/waytosen/waytosen',
#             'objects': http.request.env['waytosen.waytosen'].search([]),
#         })

#     @http.route('/waytosen/waytosen/objects/<model("waytosen.waytosen"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('waytosen.object', {
#             'object': obj
#         })