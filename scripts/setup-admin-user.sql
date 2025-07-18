-- Script para configurar roles de usuario manualmente

-- Ver todos los usuarios actuales
SELECT id_usuario, nombres, apellidos, usuario, correo, rol 
FROM usuarios 
ORDER BY id_usuario;

-- Actualizar un usuario específico a admin (rol = 1)
-- Cambia 'nombre_usuario' por el usuario que quieres hacer admin
UPDATE usuarios 
SET rol = 1 
WHERE usuario = 'nombre_usuario';

-- O actualizar por correo electrónico
-- UPDATE usuarios 
-- SET rol = 1 
-- WHERE correo = 'admin@example.com';

-- O actualizar por ID
-- UPDATE usuarios 
-- SET rol = 1 
-- WHERE id_usuario = 1;

-- Verificar el cambio
SELECT id_usuario, nombres, apellidos, usuario, correo, rol,
       CASE 
         WHEN rol = 0 THEN 'Usuario'
         WHEN rol = 1 THEN 'Administrador'
         WHEN rol = 2 THEN 'Moderador'
         ELSE 'Desconocido'
       END as rol_nombre
FROM usuarios 
WHERE rol = 1;

-- Crear un usuario admin de prueba (opcional)
/*
INSERT INTO usuarios (nombres, apellidos, correo, contrasena, usuario, rol)
VALUES (
  'Admin', 
  'Sistema', 
  'admin@trebodeluxe.com', 
  '$2a$10$hash_password_here', -- Necesitas generar un hash de contraseña
  'admin',
  1
);
*/
