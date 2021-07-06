# -*- coding: utf-8 -*-
import requests
from odoo import api, fields, models, _
import json
from odoo.exceptions import UserError

class PosOrder(models.Model):
    _inherit = 'pos.order'

    payment_failure = fields.Boolean(string='Echec de payement')


    @api.model
    def create_from_ui(self, orders):
        auth_params =  {
                "email": "super@test.mail",
                "password": "super"
            }
        auth = requests.post('http://13.79.232.153:8081/api/auth/login', headers={"Content-Type":"application/json"}, data=json.dumps(auth_params)) 
        if auth.status_code == 200:
            token = auth.json()['access_token']
            partner = self.env['res.partner'].search([('id','=', orders[0]['data']['partner_id'])])
            journal = self.env['account.journal'].search([('id','=', orders[0]['data']['statement_ids'][0][2]['journal_id'])])
            if partner and journal:
                payload_to_send = {
                        "sender_id" : partner[0].phone,
                        "amount" : orders[0]['data']['amount_paid'],
                        "account_id" : 1,
                        "checkout_id" : orders[0]['data']['pos_session_id'],
                        "payment_method" : journal[0].code
                    }
                r = requests.post('http://13.79.232.153:8081/api/transaction/dispatch', data=json.dumps(payload_to_send), headers={'Authorization': 'access_token token'})
                if r.status_code == 200:
                    raise UserError(_("Order is not paid."))

                else:
                    self.env['pos.order'].write({'payment_failure': True})
                    raise UserError(_("Order is not paid."))
                    
                   # return {'error': '_payment_error', 'status_code': r.status_code, 'message': 'Error during payment'}

        else:
            self.env['pos.order'].write({'payment_failure': True})
            return {'error': '_auth_error', 'status_code': r.status_code, 'message': 'Error when auth'}