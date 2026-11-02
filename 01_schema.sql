-- База данных «Контора». Группа 4-1ИС, Кученков.
-- Запускать один раз на разрешённом сервере.
CREATE DATABASE kont4_1is_kuchenkov CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kont4_1is_kuchenkov;

CREATE TABLE k_dept (
  dept_num INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Номер отдела',
  dept_full_name VARCHAR(45) COMMENT 'Полное название',
  dept_short_name VARCHAR(10) NOT NULL COMMENT 'Краткое название',
  k_staff_staff_num INT NULL UNIQUE COMMENT 'Руководитель отдела'
) ENGINE=InnoDB COMMENT='Отделы';

CREATE TABLE k_staff (
  staff_num INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Номер сотрудника',
  staff_name VARCHAR(45) NOT NULL COMMENT 'Имя сотрудника',
  staff_post VARCHAR(45) COMMENT 'Должность',
  staff_hiredate DATE COMMENT 'Начало работы',
  staff_termdate DATE COMMENT 'Окончание работы',
  K_dept_dept_num INT NULL COMMENT 'Номер отдела',
  FOREIGN KEY (K_dept_dept_num) REFERENCES k_dept(dept_num)
) ENGINE=InnoDB COMMENT='Сотрудники';

ALTER TABLE k_dept ADD CONSTRAINT fk_dept_head FOREIGN KEY (k_staff_staff_num) REFERENCES k_staff(staff_num);

CREATE TABLE k_firm (
  firm_num INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Номер предприятия',
  firm_name VARCHAR(45) NOT NULL COMMENT 'Название предприятия',
  firm_addr VARCHAR(45) COMMENT 'Адрес',
  firm_phone VARCHAR(20) COMMENT 'Телефон'
) ENGINE=InnoDB COMMENT='Предприятия';

CREATE TABLE k_contract (
  contract_num INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Номер договора',
  contract_date DATE NOT NULL COMMENT 'Дата договора',
  contract_type ENUM('A','B','C') NOT NULL COMMENT 'Тип договора',
  k_firm_firm_num INT NOT NULL COMMENT 'Предприятие',
  k_staff_staff_num INT NOT NULL COMMENT 'Ответственный сотрудник',
  FOREIGN KEY (k_firm_firm_num) REFERENCES k_firm(firm_num),
  FOREIGN KEY (k_staff_staff_num) REFERENCES k_staff(staff_num)
) ENGINE=InnoDB COMMENT='Договоры';

CREATE TABLE k_bill (
  bill_num INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Номер счёта',
  bill_date DATE COMMENT 'Дата счёта',
  bill_sum DECIMAL(9,2) COMMENT 'Сумма',
  bill_term DATE COMMENT 'Срок оплаты',
  bill_peni DECIMAL(6,2) COMMENT 'Пени',
  k_contract_contract_num INT NOT NULL COMMENT 'Договор',
  FOREIGN KEY (k_contract_contract_num) REFERENCES k_contract(contract_num)
) ENGINE=InnoDB COMMENT='Счета';

CREATE TABLE k_payment (
  payment_num INT NOT NULL COMMENT 'Номер платежа в счёте',
  payment_date DATE COMMENT 'Дата платежа',
  payment_sum DECIMAL(9,2) COMMENT 'Сумма платежа',
  k_bill_bill_num INT NOT NULL COMMENT 'Номер счёта',
  PRIMARY KEY (k_bill_bill_num, payment_num),
  FOREIGN KEY (k_bill_bill_num) REFERENCES k_bill(bill_num)
) ENGINE=InnoDB COMMENT='Платежи';

CREATE TABLE k_price (
  price_num INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Номер товара или услуги',
  price_name VARCHAR(45) NOT NULL COMMENT 'Наименование',
  price_sum DECIMAL(9,2) COMMENT 'Цена',
  price_type VARCHAR(1) COMMENT 'Товар или услуга'
) ENGINE=InnoDB COMMENT='Прайс-лист';

CREATE TABLE k_protokol (
  k_bill_bill_num INT NOT NULL COMMENT 'Счёт',
  k_price_price_num INT NOT NULL COMMENT 'Товар или услуга',
  kolvo INT NOT NULL COMMENT 'Количество',
  price_sum DECIMAL(9,2) NOT NULL COMMENT 'Цена в счёте',
  PRIMARY KEY (k_bill_bill_num,k_price_price_num),
  FOREIGN KEY (k_bill_bill_num) REFERENCES k_bill(bill_num),
  FOREIGN KEY (k_price_price_num) REFERENCES k_price(price_num)
) ENGINE=InnoDB COMMENT='Состав счёта';
