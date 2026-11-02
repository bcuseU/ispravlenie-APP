USE kont4_1is_kuchenkov;
SET NAMES utf8mb4;
-- Телефоны вымышленные, приведены для учебного примера.
INSERT INTO k_firm (firm_name,firm_addr,firm_phone) VALUES ('Альфа','Москва','+7 900 000-00-01'),('Бета','Казань','+7 900 000-00-02'),('Гамма','Париж','+7 900 000-00-03'),('Дельта','Лондон','+7 900 000-00-04'),('Омега','Токио','+7 900 000-00-05');
INSERT INTO k_dept (dept_short_name,dept_full_name) VALUES ('Sales','Отдел продаж'),('Mart','Отдел маркетинга'),('Cust','Отдел гарантийного обслуживания');
INSERT INTO k_staff (staff_name,K_dept_dept_num,staff_hiredate,staff_post) VALUES ('Иванов',1,'1999-01-01','Менеджер'),('Петров',2,'2010-10-13','Менеджер'),('Сидоров',3,'2005-12-01','Менеджер'),('Семенов',NULL,'1990-01-01','Директор'),('Григорьев',3,'2008-12-19','Программист');
UPDATE k_dept SET k_staff_staff_num=1 WHERE dept_num=1;
UPDATE k_dept SET k_staff_staff_num=2 WHERE dept_num=2;
UPDATE k_dept SET k_staff_staff_num=3 WHERE dept_num=3;
INSERT INTO k_contract (contract_type,k_firm_firm_num,k_staff_staff_num,contract_date) VALUES ('A',1,1,'2011-11-01'),('B',1,2,'2011-10-01'),('C',1,1,'2011-09-01'),('A',2,2,'2011-11-15'),('B',2,2,'2011-08-01'),('C',3,1,'2011-07-15'),('A',4,1,'2011-11-12');
INSERT INTO k_bill (k_contract_contract_num,bill_date,bill_term,bill_sum) VALUES (1,'2011-11-12','2011-12-12',1000),(1,'2011-12-12','2012-01-12',2000),(1,'2012-01-12','2012-02-12',2000),(2,'2011-12-12','2012-01-12',6000),(2,'2012-01-12','2012-02-12',2000),(3,'2012-01-12','2012-02-12',2500),(4,'2011-12-12','2012-01-12',1500),(5,'2011-12-12','2012-01-12',1200),(5,'2012-01-12','2012-02-12',10000);
-- Прайс-лист, состав счетов и платежи.
INSERT INTO k_price(price_name,price_sum,price_type) VALUES ('Изделие из рога',1000,'Т'),('Обслуживание',1500,'У');
INSERT INTO k_protokol(k_bill_bill_num,k_price_price_num,kolvo,price_sum) VALUES (1,1,1,1000),(7,2,1,1500);
INSERT INTO k_payment(k_bill_bill_num,payment_num,payment_date,payment_sum) VALUES (1,1,'2011-11-20',500),(1,2,'2011-12-01',500),(7,1,'2011-12-20',1500);
