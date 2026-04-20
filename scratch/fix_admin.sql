-- scratch/fix_admin.sql
UPDATE users 
SET password_hash = '$2y$12$Dh/nexGdUdfMK01Ie8.eq.9dAu8U87ZMewlxEys/CM8KYe6WLU882' 
WHERE role = 'admin';
