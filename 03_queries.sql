USE kont4_1is_kuchenkov;
-- Предприятия и их договоры.
SELECT f.firm_name, c.contract_num, c.contract_date, c.contract_type
FROM k_firm f LEFT JOIN k_contract c ON c.k_firm_firm_num=f.firm_num
ORDER BY f.firm_num, c.contract_num;

-- Сотрудники и их отделы, включая директора без отдела.
SELECT s.staff_name, s.staff_post, d.dept_short_name
FROM k_staff s LEFT JOIN k_dept d ON d.dept_num=s.K_dept_dept_num;

-- Все счета с предприятием и суммой.
SELECT b.bill_num, b.bill_date, f.firm_name, b.bill_sum
FROM k_bill b JOIN k_contract c ON c.contract_num=b.k_contract_contract_num
JOIN k_firm f ON f.firm_num=c.k_firm_firm_num ORDER BY b.bill_num;

-- Сколько договоров у каждого предприятия.
SELECT f.firm_num, f.firm_name, COUNT(c.contract_num) AS contracts_count
FROM k_firm f LEFT JOIN k_contract c ON c.k_firm_firm_num=f.firm_num
GROUP BY f.firm_num, f.firm_name ORDER BY f.firm_num;

-- Платежи по счетам.
SELECT b.bill_num, p.payment_num, p.payment_date, p.payment_sum
FROM k_bill b JOIN k_payment p ON p.k_bill_bill_num=b.bill_num
ORDER BY b.bill_num, p.payment_num;
