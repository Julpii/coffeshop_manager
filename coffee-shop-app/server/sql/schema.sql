-- Coffee shop schema (MySQL 8+). Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  role          ENUM('admin','cashier') NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Products are "soft deleted" (deleted_at) so old orders keep making sense.
-- category_id becomes NULL only if a category is removed after its products were archived.
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  category_id INT NULL,
  price       DECIMAL(10,2) NOT NULL,
  image_path  VARCHAR(255) NULL,
  description VARCHAR(255) NULL,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  deleted_at  DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT chk_products_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- The order id is the invoice number (auto increment). Shown as INV-000123.
-- order_no is the small queue number that restarts every day.
CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_date       DATE NOT NULL,
  order_no         INT NOT NULL,
  customer_name    VARCHAR(100) NULL,
  dining_method    ENUM('Dine In','Take Away') NOT NULL,
  status            ENUM('New Order','Preparing','Ready to Serve','Finished','Cancelled') NOT NULL DEFAULT 'New Order',
  payment_method   ENUM('Cash','Card','E-Wallet/QR') NOT NULL,
  payment_mode     ENUM('cash','manual_confirmation') NOT NULL,
  amount_received  DECIMAL(10,2) NULL,
  change_given     DECIMAL(10,2) NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  tax_rate         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  tax_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  notes            VARCHAR(500) NULL,
  cancel_reason    VARCHAR(255) NULL,
  idempotency_key  VARCHAR(64) NULL UNIQUE,
  created_by       INT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at     DATETIME NULL,
  UNIQUE KEY uq_orders_day_no (order_date, order_no),
  KEY idx_orders_status (status),
  KEY idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- product_name and unit_price are snapshots, so later edits never change old sales.
CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  product_id   INT NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  quantity     INT NOT NULL,
  line_total   DECIMAL(10,2) NOT NULL,
  KEY idx_items_order (order_id),
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT chk_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB;
