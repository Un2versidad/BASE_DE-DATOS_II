#!/bin/sh
set -eu

APP_VHOST="${RABBITMQ_APP_VHOST:-cinemax}"
MANAGEMENT_USER="${RABBITMQ_MANAGEMENT_USER:-app-user}"
MANAGEMENT_PASS="${RABBITMQ_MANAGEMENT_PASS:-app-password}"
TICKETS_USER="${RABBITMQ_TICKETS_USER:-tickets-user}"
TICKETS_PASS="${RABBITMQ_TICKETS_PASS:-tickets-password}"
ORDERS_USER="${RABBITMQ_ORDERS_USER:-orders-user}"
ORDERS_PASS="${RABBITMQ_ORDERS_PASS:-orders-password}"
PAYMENTS_USER="${RABBITMQ_PAYMENTS_USER:-payments-user}"
PAYMENTS_PASS="${RABBITMQ_PAYMENTS_PASS:-payments-password}"
EXPIRATION_USER="${RABBITMQ_EXPIRATION_USER:-expiration-user}"
EXPIRATION_PASS="${RABBITMQ_EXPIRATION_PASS:-expiration-password}"

TICKETS_ACL='^(orders|tickets|ticketsOrdersQueueCreate(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?|ticketsOrdersQueueCancel(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?)$'
ORDERS_ACL='^(orders|tickets|payment|expiration|ticketsCreateQueue(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?|ticketsUpdateQueue(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?|paymentQueueCreate(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?|expirationQueueComplete(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?)$'
PAYMENTS_ACL='^(orders|payment|paymentsOrdersQueueCreate(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?|paymentsOrdersQueueCancel(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?)$'
EXPIRATION_ACL='^(orders|expiration|expirationOrdersQueueCreate(\\.retry\\.exchange|\\.retry\\.queue|\\.dlx|\\.dlq)?)$'

cat > /etc/rabbitmq/definitions.json <<EOF
{
  "users": [
    { "name": "${MANAGEMENT_USER}", "password": "${MANAGEMENT_PASS}", "tags": "administrator" },
    { "name": "${TICKETS_USER}", "password": "${TICKETS_PASS}", "tags": "" },
    { "name": "${ORDERS_USER}", "password": "${ORDERS_PASS}", "tags": "" },
    { "name": "${PAYMENTS_USER}", "password": "${PAYMENTS_PASS}", "tags": "" },
    { "name": "${EXPIRATION_USER}", "password": "${EXPIRATION_PASS}", "tags": "" }
  ],
  "vhosts": [
    { "name": "${APP_VHOST}" }
  ],
  "permissions": [
    { "user": "${MANAGEMENT_USER}", "vhost": "${APP_VHOST}", "configure": ".*", "write": ".*", "read": ".*" },
    { "user": "${TICKETS_USER}", "vhost": "${APP_VHOST}", "configure": "${TICKETS_ACL}", "write": "${TICKETS_ACL}", "read": "${TICKETS_ACL}" },
    { "user": "${ORDERS_USER}", "vhost": "${APP_VHOST}", "configure": "${ORDERS_ACL}", "write": "${ORDERS_ACL}", "read": "${ORDERS_ACL}" },
    { "user": "${PAYMENTS_USER}", "vhost": "${APP_VHOST}", "configure": "${PAYMENTS_ACL}", "write": "${PAYMENTS_ACL}", "read": "${PAYMENTS_ACL}" },
    { "user": "${EXPIRATION_USER}", "vhost": "${APP_VHOST}", "configure": "${EXPIRATION_ACL}", "write": "${EXPIRATION_ACL}", "read": "${EXPIRATION_ACL}" }
  ]
}
EOF

cat > /etc/rabbitmq/rabbitmq.conf <<EOF
loopback_users.guest = false
management.load_definitions = /etc/rabbitmq/definitions.json
EOF

exec docker-entrypoint.sh rabbitmq-server
