odoo.define('popup_phone_paid.pos', function (require) {
    "use strict";
    var core = require('web.core');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var PopupWidget = require('point_of_sale.popups');
    var PaymentScreenWidget = screens.PaymentScreenWidget;
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var BarcodeEvents = require('barcodes.BarcodeEvents').BarcodeEvents;
    var time = require('web.time');
    var QWeb = core.qweb;
    var _t = core._t;

    var PopupPhonePaid = PopupWidget.extend({
        template: 'PopupPhonePaid',
        show: function (options) {
            options = options || {};
            this._super(options);

            this.renderElement();
        },
        click_confirm: function () {
            var value = this.$('input,textarea').val();
            this.gui.close_popup();
            if (this.options.confirm) {
                this.options.confirm.call(this, value);
            }
        },
    });

    gui.define_popup({ name: 'popup_phone_paid', widget: PopupPhonePaid });


    PaymentScreenWidget.include({
        init: function (parent, options) {
            var self = this;
            this._super(parent, options);

            this.pos.bind('change:selectedOrder', function () {
                this.renderElement();
                this.watch_order_changes();
            }, this);
            this.watch_order_changes();

            this.inputbuffer = "";
            this.firstinput = true;
            this.decimal_point = _t.database.parameters.decimal_point;

            // This is a keydown handler that prevents backspace from
            // doing a back navigation. It also makes sure that keys that
            // do not generate a keypress in Chrom{e,ium} (eg. delete,
            // backspace, ...) get passed to the keypress handler.
            this.keyboard_keydown_handler = function (event) {
                if (event.keyCode === 8 || event.keyCode === 46) { // Backspace and Delete
                    // event.preventDefault();

                    // These do not generate keypress events in
                    // Chrom{e,ium}. Even if they did, we just called
                    // preventDefault which will cancel any keypress that
                    // would normally follow. So we call keyboard_handler
                    // explicitly with this keydown event.
                    self.keyboard_handler(event);
                }
            };

            // This keyboard handler listens for keypress events. It is
            // also called explicitly to handle some keydown events that
            // do not generate keypress events.
            this.keyboard_handler = function (event) {
                // On mobile Chrome BarcodeEvents relies on an invisible
                // input being filled by a barcode device. Let events go
                // through when this input is focused.
                if (BarcodeEvents.$barcodeInput && BarcodeEvents.$barcodeInput.is(":focus")) {
                    return;
                }

                var key = '';

                if (event.type === "keypress") {
                    if (event.keyCode === 13) { // Enter
                        self.validate_order();
                    } else if (event.keyCode === 190 || // Dot
                        event.keyCode === 110 || // Decimal point (numpad)
                        event.keyCode === 188 || // Comma
                        event.keyCode === 46) { // Numpad dot
                        key = self.decimal_point;
                    } else if (event.keyCode >= 48 && event.keyCode <= 57) { // Numbers
                        key = '' + (event.keyCode - 48);
                    } else if (event.keyCode === 45) { // Minus
                        key = '-';
                    } else if (event.keyCode === 43) { // Plus
                        key = '+';
                    }
                } else { // keyup/keydown
                    if (event.keyCode === 46) { // Delete
                        key = 'CLEAR';
                    } else if (event.keyCode === 8) { // Backspace
                        key = 'BACKSPACE';
                    }
                }

                // self.payment_input(key);
                // event.preventDefault();
            };

            this.pos.bind('change:selectedClient', function () {
                self.customer_changed();
            }, this);
        },


        renderElement: function () {
            var self = this;
            this._super();

            this.$('.next').addClass('.validatePayment');
            this.$('.validatePayment').removeClass('.next');

            this._super();

            this.$('.validatePayment').click(function () {
                self.pay_online();
                self.validate_order();
            });

            this.$('.popup_phone_paids').click(function () {
                self.get_select_data();
            });
        },

        order_is_valid: function (force_validation) {
            console.log('order_is_valid');
            var self = this;
            var order = this.pos.get_order();

            console.log(order);
            var data = {
                "email": "super@test.mail",
                "password": "super"
            }
            $.ajax({
                type: 'post',
                url: 'http://13.79.232.153:8081/api/auth/login',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function (data) {
                    console.log("SUCCESS ", data);

                    var token = data['access_token']

                    console.log("TOKEN ", token);

                    if (order.get_orderlines().length === 0) {
                        self.gui.show_popup('error', {
                            'title': _t('Empty Order'),
                            'body': _t('There must be at least one product in your order before it can be validated'),
                        });
                        return false;
                    }

                    else {
                        var payment_method = self.get_payment_methode_code(order.get_paymentlines()[0].name)

                        if (payment_method == 0) this._super();
                        else {
                            var payload_to_send = {
                                "sender_id": order.get_phone_paid(),
                                "amount": order.get_total_with_tax(),
                                "account_id": 1,
                                "payment_method": payment_method
                            }

                            console.log(payload_to_send)

                            $.ajax({
                                type: 'post',
                                url: 'http://13.79.232.153:8081/api/transaction/dispatch',
                                contentType: 'application/json',
                                data: JSON.stringify(payload_to_send),
                                headers: {
                                    'Authorization': 'Bearer '+token,
                                    'Access-Control-Allow-Origin': '*'
                                },
                                success: function (data) {
                                    console.log("SUCCESS ", data);
                                    return true
                                },
                                error: function (data) {
                                    console.log("ERROR ", data);
                                    self.gui.show_popup('error', {
                                        'title': _t('Payement'),
                                        'body': _t('Le payement a échoué'),
                                    });
                                    return false;
                                }
                            })
                        }
                    }
                },
                error: function (data) {
                    console.log("ERROR ", data);
                    self.gui.show_popup('error', {
                        'title': _t('Payement'),
                        'body': _t('Le payement a échoué'),
                    });
                    return false;
                }
            })
        },


        get_payment_methode_code: function (payement_name) {
            console.log(payement_name);
            if (payement_name.toLowerCase().includes("wave", 0)) return 12;
            if (payement_name.toLowerCase().includes("om", 0)) return 202;
            if (payement_name.toLowerCase().includes("wari", 0)) return 45;
            else 0
        },


        get_select_data: function () {
            var self = this;
            self.gui.show_popup('popup_phone_paid', {
                title: _t('numéro de téléphone du client'),
                confirm: function () {
                    var order = self.pos.get_order();
                    order.set_phone_paid_value(document.getElementsByName("popup_phone_paid")[0].value)
                },
                cancel: function () { },
            });
        },
        get_input_value: function () {
            return document.getElementsByName("popup_phone_paid")[0].value;
        },
    });


    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function (attr, options) {
            this.phone_paid_value = false;
            _super_order.initialize.apply(this, arguments);
        },

        set_phone_paid_value: function (phone_paid_value) {
            this.phone_paid_value = phone_paid_value;
        },

        get_phone_paid: function () {
            return this.phone_paid_value;
        },

        export_as_JSON: function () {
            var json = _super_order.export_as_JSON.apply(this, arguments);
            var order = this.pos.get('selectedOrder');
            if (order) {
                json.field_input_value = this.phone_paid_value;
            }
            return json
        },
    });
});