exports.up = function(knex) {
  return knex.raw(`
    -- Primero eliminar la constraint actual
    ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
    
    -- Cambiar el tipo de dato y agregar nueva constraint
    ALTER TABLE usuarios 
    ALTER COLUMN rol TYPE INTEGER USING (
      CASE 
        WHEN rol = 'user' THEN 0
        WHEN rol = 'admin' THEN 1
        WHEN rol = 'moderator' THEN 2
        ELSE 0
      END
    );
    
    -- Establecer valor por defecto
    ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 0;
    
    -- Agregar nueva constraint
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN (0, 1, 2));
    
    -- Comentario explicativo
    COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario: 0=user, 1=admin, 2=moderator';
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    -- Revertir a string
    ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
    
    ALTER TABLE usuarios 
    ALTER COLUMN rol TYPE VARCHAR(20) USING (
      CASE 
        WHEN rol = 0 THEN 'user'
        WHEN rol = 1 THEN 'admin'
        WHEN rol = 2 THEN 'moderator'
        ELSE 'user'
      END
    );
    
    ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'user';
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('user', 'admin', 'moderator'));
  `);
};
