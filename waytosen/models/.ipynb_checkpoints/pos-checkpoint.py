from odoo import fields, models, api

class PosOrder(models.Model):
    _inherit = 'pos.order'

    input_field_value = fields.Integer(string='Numéro de telephone du client')

    @api.model
    def _order_fields(self, ui_order):
        res = super(PosOrder, self)._order_fields(ui_order)
        res['input_field_value'] = ui_order['field_input_value'] if ui_order['field_input_value'] else False
        return res
