ALTER TABLE department ADD CONSTRAINT uk_department_name UNIQUE (name);
ALTER TABLE "position" ADD CONSTRAINT uk_position_name UNIQUE (name);
