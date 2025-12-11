
-- Modificar el trigger para que el primer usuario sea admin automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_count INTEGER;
  v_assigned_role app_role;
BEGIN
  -- Contar usuarios existentes
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- Si es el primer usuario, asignar admin, sino operador
  IF v_user_count = 0 THEN
    v_assigned_role := 'admin';
  ELSE
    v_assigned_role := 'operador';
  END IF;

  INSERT INTO public.profiles (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_assigned_role);
  
  RETURN NEW;
END;
$function$;
