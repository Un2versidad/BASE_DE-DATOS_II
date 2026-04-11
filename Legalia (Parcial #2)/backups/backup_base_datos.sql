/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
DROP TABLE IF EXISTS `aseguradoras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `aseguradoras` (
  `id` binary(16) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_aseguradoras_deleted` (`deleted_at`),
  CONSTRAINT `chk_aseguradoras_nombre_len` CHECK (char_length(`nombre`) between 2 and 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `aseguradoras` WRITE;
/*!40000 ALTER TABLE `aseguradoras` DISABLE KEYS */;
INSERT INTO `aseguradoras` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33E378FBB4B1B32529661F2A,'ASSA','2026-04-09 04:59:38','2026-04-10 11:14:43');
INSERT INTO `aseguradoras` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33E67BB6B5BA8B049C026A29,'ANCON','2026-04-09 04:59:38','2026-04-09 05:11:29');
INSERT INTO `aseguradoras` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33E87ADA8FA4CCB218B3FB11,'CONANCE','2026-04-09 04:59:38',NULL);
INSERT INTO `aseguradoras` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33EB71CAB1E4750DEEBD19DA,'PARTICULAR','2026-04-09 04:59:38',NULL);
INSERT INTO `aseguradoras` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33F27854A90C5B6D0CD2D4F1,'INTEROCEANICA','2026-04-09 04:59:38',NULL);
/*!40000 ALTER TABLE `aseguradoras` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` binary(16) NOT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`changes`)),
  `ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_table_record` (`table_name`,`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` (`id`, `user_id`, `action`, `table_name`, `record_id`, `changes`, `ip`, `created_at`) VALUES (0x019D70A70E1E72C19753EE4994BA865B,0x019D709C337978B99B2A0F603456A307,'DELETE','aseguradoras',0x019D709C33E67BB6B5BA8B049C026A29,'{\"deleted\": true}','172.18.0.1','2026-04-09 05:11:29');
INSERT INTO `audit_log` (`id`, `user_id`, `action`, `table_name`, `record_id`, `changes`, `ip`, `created_at`) VALUES (0x019D7719F7097FB281157CB7C4DE3F54,0x019D709C337978B99B2A0F603456A307,'DELETE','aseguradoras',0x019D709C33E378FBB4B1B32529661F2A,'{\"deleted\": true}','172.18.0.1','2026-04-10 11:14:43');
INSERT INTO `audit_log` (`id`, `user_id`, `action`, `table_name`, `record_id`, `changes`, `ip`, `created_at`) VALUES (0xE95BE40933D011F181CAFE04D67287D8,NULL,'CREATE','expedientes',0x019D709C34077997A1992CB9001E5CAD,'{\"new\": {\"id\": \"019d709c34077997a1992cb9001e5cad\", \"aseguradora_id\": \"019d709c33e378fbb4b1b32529661f2a\", \"juzgado_id\": \"019d709c33f677aba5dbd292c6332fe7\", \"abogado\": \"Anthony Trejos\", \"estado\": \"Pendiente\", \"fecha\": \"2026-04-09\"}}',NULL,'2026-04-09 04:59:38');
INSERT INTO `audit_log` (`id`, `user_id`, `action`, `table_name`, `record_id`, `changes`, `ip`, `created_at`) VALUES (0xE95C77DD33D011F181CAFE04D67287D8,NULL,'CREATE','expedientes',0x019D709C340D76DCB86F36E1EB41C4BE,'{\"new\": {\"id\": \"019d709c340d76dcb86f36e1eb41c4be\", \"aseguradora_id\": \"019d709c33e67bb6b5ba8b049c026a29\", \"juzgado_id\": \"019d709c33f970faa7dbc3069030ff1c\", \"abogado\": \"Luis Molina\", \"estado\": \"En curso\", \"fecha\": \"2026-04-09\"}}',NULL,'2026-04-09 04:59:38');
INSERT INTO `audit_log` (`id`, `user_id`, `action`, `table_name`, `record_id`, `changes`, `ip`, `created_at`) VALUES (0xE95D824833D011F181CAFE04D67287D8,NULL,'CREATE','expedientes',0x019D709C34137E0DABB374B213D9EF75,'{\"new\": {\"id\": \"019d709c34137e0dabb374b213d9ef75\", \"aseguradora_id\": \"019d709c33e87ada8fa4ccb218b3fb11\", \"juzgado_id\": \"019d709c33fc73d2abf87509543b36a5\", \"abogado\": \"Katherine Kent\", \"estado\": \"Cerrado\", \"fecha\": \"2026-04-09\"}}',NULL,'2026-04-09 04:59:38');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `expediente_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expediente_versions` (
  `id` binary(16) NOT NULL,
  `expediente_id` binary(16) NOT NULL,
  `version` int(11) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_expediente_versions_exp` (`expediente_id`),
  CONSTRAINT `fk_expediente_versions_expediente` FOREIGN KEY (`expediente_id`) REFERENCES `expedientes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `expediente_versions` WRITE;
/*!40000 ALTER TABLE `expediente_versions` DISABLE KEYS */;
/*!40000 ALTER TABLE `expediente_versions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `expedientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expedientes` (
  `id` binary(16) NOT NULL,
  `aseguradora_id` binary(16) NOT NULL,
  `juzgado_id` binary(16) NOT NULL,
  `abogado` varchar(100) NOT NULL,
  `estado` enum('Pendiente','En curso','Cerrado') NOT NULL,
  `fecha` date NOT NULL,
  `version` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_expedientes_aseguradora` (`aseguradora_id`),
  KEY `fk_expedientes_juzgado` (`juzgado_id`),
  KEY `idx_expedientes_fecha` (`fecha`),
  KEY `idx_expedientes_estado` (`estado`),
  KEY `idx_expedientes_deleted` (`deleted_at`),
  CONSTRAINT `fk_expedientes_aseguradora` FOREIGN KEY (`aseguradora_id`) REFERENCES `aseguradoras` (`id`),
  CONSTRAINT `fk_expedientes_juzgado` FOREIGN KEY (`juzgado_id`) REFERENCES `juzgados` (`id`),
  CONSTRAINT `chk_expedientes_abogado_len` CHECK (char_length(`abogado`) between 2 and 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `expedientes` WRITE;
/*!40000 ALTER TABLE `expedientes` DISABLE KEYS */;
INSERT INTO `expedientes` (`id`, `aseguradora_id`, `juzgado_id`, `abogado`, `estado`, `fecha`, `version`, `created_at`, `updated_at`, `deleted_at`) VALUES (0x019D709C34077997A1992CB9001E5CAD,0x019D709C33E378FBB4B1B32529661F2A,0x019D709C33F677ABA5DBD292C6332FE7,'Anthony Trejos','Pendiente','2026-04-09',1,'2026-04-09 04:59:38',NULL,NULL);
INSERT INTO `expedientes` (`id`, `aseguradora_id`, `juzgado_id`, `abogado`, `estado`, `fecha`, `version`, `created_at`, `updated_at`, `deleted_at`) VALUES (0x019D709C340D76DCB86F36E1EB41C4BE,0x019D709C33E67BB6B5BA8B049C026A29,0x019D709C33F970FAA7DBC3069030FF1C,'Luis Molina','En curso','2026-04-09',1,'2026-04-09 04:59:38',NULL,NULL);
INSERT INTO `expedientes` (`id`, `aseguradora_id`, `juzgado_id`, `abogado`, `estado`, `fecha`, `version`, `created_at`, `updated_at`, `deleted_at`) VALUES (0x019D709C34137E0DABB374B213D9EF75,0x019D709C33E87ADA8FA4CCB218B3FB11,0x019D709C33FC73D2ABF87509543B36A5,'Katherine Kent','Cerrado','2026-04-09',1,'2026-04-09 04:59:38',NULL,NULL);
/*!40000 ALTER TABLE `expedientes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_expedientes_after_insert
AFTER INSERT ON expedientes
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (id, user_id, action, table_name, record_id, changes, ip)
    VALUES (
        UNHEX(REPLACE(UUID(), '-', '')),
        @app_user_id,
        'CREATE',
        'expedientes',
        NEW.id,
        JSON_OBJECT('new', JSON_OBJECT(
            'id', LOWER(HEX(NEW.id)),
            'aseguradora_id', LOWER(HEX(NEW.aseguradora_id)),
            'juzgado_id', LOWER(HEX(NEW.juzgado_id)),
            'abogado', NEW.abogado,
            'estado', NEW.estado,
            'fecha', NEW.fecha
        )),
        @app_user_ip
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_expedientes_before_update
BEFORE UPDATE ON expedientes
FOR EACH ROW
BEGIN
    INSERT INTO expediente_versions (id, expediente_id, version, data)
    VALUES (
        UNHEX(REPLACE(UUID(), '-', '')),
        OLD.id,
        OLD.version,
        JSON_OBJECT(
            'id', LOWER(HEX(OLD.id)),
            'aseguradora_id', LOWER(HEX(OLD.aseguradora_id)),
            'juzgado_id', LOWER(HEX(OLD.juzgado_id)),
            'abogado', OLD.abogado,
            'estado', OLD.estado,
            'fecha', OLD.fecha,
            'version', OLD.version,
            'created_at', OLD.created_at,
            'updated_at', OLD.updated_at,
            'deleted_at', OLD.deleted_at
        )
    );

    SET NEW.version = OLD.version + 1;
    SET NEW.updated_at = NOW();

    INSERT INTO audit_log (id, user_id, action, table_name, record_id, changes, ip)
    VALUES (
        UNHEX(REPLACE(UUID(), '-', '')),
        @app_user_id,
        'UPDATE',
        'expedientes',
        OLD.id,
        JSON_OBJECT(
            'old', JSON_OBJECT(
                'aseguradora_id', LOWER(HEX(OLD.aseguradora_id)),
                'juzgado_id', LOWER(HEX(OLD.juzgado_id)),
                'abogado', OLD.abogado,
                'estado', OLD.estado,
                'fecha', OLD.fecha,
                'version', OLD.version,
                'deleted_at', OLD.deleted_at
            ),
            'new', JSON_OBJECT(
                'aseguradora_id', LOWER(HEX(NEW.aseguradora_id)),
                'juzgado_id', LOWER(HEX(NEW.juzgado_id)),
                'abogado', NEW.abogado,
                'estado', NEW.estado,
                'fecha', NEW.fecha,
                'version', NEW.version,
                'deleted_at', NEW.deleted_at
            )
        ),
        @app_user_ip
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
DROP TABLE IF EXISTS `juzgados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `juzgados` (
  `id` binary(16) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_juzgados_deleted` (`deleted_at`),
  CONSTRAINT `chk_juzgados_nombre_len` CHECK (char_length(`nombre`) between 2 and 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `juzgados` WRITE;
/*!40000 ALTER TABLE `juzgados` DISABLE KEYS */;
INSERT INTO `juzgados` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33F677ABA5DBD292C6332FE7,'JUZGADO 5TO (PEDREGAL)','2026-04-09 04:59:38',NULL);
INSERT INTO `juzgados` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33F970FAA7DBC3069030FF1C,'JUZGADO 4TO (PEDREGAL)','2026-04-09 04:59:38',NULL);
INSERT INTO `juzgados` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33FC73D2ABF87509543B36A5,'JUZGADO 1RO (PEDREGAL)','2026-04-09 04:59:38',NULL);
INSERT INTO `juzgados` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C33FE767C8A908DF273052B3E,'JUZGADO 3RO (PEDREGAL)','2026-04-09 04:59:38',NULL);
INSERT INTO `juzgados` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C340072EDA4C190A0872752C6,'ALCALDIA DE PANAMA','2026-04-09 04:59:38',NULL);
INSERT INTO `juzgados` (`id`, `nombre`, `created_at`, `deleted_at`) VALUES (0x019D709C3404733FBC0245E059312DB5,'CHITRE','2026-04-09 04:59:38',NULL);
/*!40000 ALTER TABLE `juzgados` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` binary(16) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C330E7AB89F9B4F2CE21239C6,'agenda.read');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C33187C2591F971F30C0E87F1,'catalog.manage');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C33017EBBBB90F8729F8C3A2E,'expediente.create');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C330B7995BB565816006A6589,'expediente.delete');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C32FA74C09318B690B44ADA03,'expediente.read');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C330477A1B913E49AD01A6348,'expediente.update');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C331170A9B17F701F8D17F9B7,'report.read');
INSERT INTO `permissions` (`id`, `name`) VALUES (0x019D709C33147BBAA00E15F5070F5960,'user.manage');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` binary(16) NOT NULL,
  `permission_id` binary(16) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C32FA74C09318B690B44ADA03);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C334675AEA463C1E8A557AF67,0x019D709C32FA74C09318B690B44ADA03);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C335B71949941E5AC28825F23,0x019D709C32FA74C09318B690B44ADA03);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C336B7CACA6F8A79B97024AD5,0x019D709C32FA74C09318B690B44ADA03);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C33017EBBBB90F8729F8C3A2E);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C334675AEA463C1E8A557AF67,0x019D709C33017EBBBB90F8729F8C3A2E);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C330477A1B913E49AD01A6348);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C334675AEA463C1E8A557AF67,0x019D709C330477A1B913E49AD01A6348);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C330B7995BB565816006A6589);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C330E7AB89F9B4F2CE21239C6);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C334675AEA463C1E8A557AF67,0x019D709C330E7AB89F9B4F2CE21239C6);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C335B71949941E5AC28825F23,0x019D709C330E7AB89F9B4F2CE21239C6);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C336B7CACA6F8A79B97024AD5,0x019D709C330E7AB89F9B4F2CE21239C6);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C331170A9B17F701F8D17F9B7);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C334675AEA463C1E8A557AF67,0x019D709C331170A9B17F701F8D17F9B7);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C335B71949941E5AC28825F23,0x019D709C331170A9B17F701F8D17F9B7);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C336B7CACA6F8A79B97024AD5,0x019D709C331170A9B17F701F8D17F9B7);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C33147BBAA00E15F5070F5960);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C331C79B583EA892595F685CC,0x019D709C33187C2591F971F30C0E87F1);
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (0x019D709C335B71949941E5AC28825F23,0x019D709C33187C2591F971F30C0E87F1);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` binary(16) NOT NULL,
  `name` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` (`id`, `name`) VALUES (0x019D709C334675AEA463C1E8A557AF67,'abogado');
INSERT INTO `roles` (`id`, `name`) VALUES (0x019D709C331C79B583EA892595F685CC,'admin');
INSERT INTO `roles` (`id`, `name`) VALUES (0x019D709C335B71949941E5AC28825F23,'secretaria');
INSERT INTO `roles` (`id`, `name`) VALUES (0x019D709C336B7CACA6F8A79B97024AD5,'viewer');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` binary(16) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_users_role` (`role_id`),
  KEY `idx_users_deleted` (`deleted_at`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `chk_users_username_len` CHECK (char_length(`username`) between 3 and 50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `username`, `password_hash`, `role_id`, `created_at`, `deleted_at`) VALUES (0x019D709C337978B99B2A0F603456A307,'admin','$argon2id$v=19$m=65536,t=3,p=4$Wmi0Q1EBF2hdpnqhTxDpxg$bY+Iqm3TKWryu5rKi9+mQXmWmsN1qvIBdDZYeuoRi/A',0x019D709C331C79B583EA892595F685CC,'2026-04-09 04:59:38',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `v_agenda_diaria`;
/*!50001 DROP VIEW IF EXISTS `v_agenda_diaria`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_agenda_diaria` AS SELECT
 1 AS `id`,
  1 AS `aseguradora_id`,
  1 AS `aseguradora_nombre`,
  1 AS `juzgado_id`,
  1 AS `juzgado_nombre`,
  1 AS `abogado`,
  1 AS `estado`,
  1 AS `fecha`,
  1 AS `version`,
  1 AS `created_at` */;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_estadisticas_por_estado`;
/*!50001 DROP VIEW IF EXISTS `v_estadisticas_por_estado`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_estadisticas_por_estado` AS SELECT
 1 AS `estado`,
  1 AS `total` */;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_expedientes_completos`;
/*!50001 DROP VIEW IF EXISTS `v_expedientes_completos`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_expedientes_completos` AS SELECT
 1 AS `id`,
  1 AS `aseguradora_id`,
  1 AS `aseguradora_nombre`,
  1 AS `juzgado_id`,
  1 AS `juzgado_nombre`,
  1 AS `abogado`,
  1 AS `estado`,
  1 AS `fecha`,
  1 AS `version`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `deleted_at` */;
SET character_set_client = @saved_cs_client;
/*!50001 DROP VIEW IF EXISTS `v_agenda_diaria`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_agenda_diaria` AS select lcase(hex(`e`.`id`)) AS `id`,lcase(hex(`e`.`aseguradora_id`)) AS `aseguradora_id`,`a`.`nombre` AS `aseguradora_nombre`,lcase(hex(`e`.`juzgado_id`)) AS `juzgado_id`,`j`.`nombre` AS `juzgado_nombre`,`e`.`abogado` AS `abogado`,`e`.`estado` AS `estado`,`e`.`fecha` AS `fecha`,`e`.`version` AS `version`,`e`.`created_at` AS `created_at` from ((`expedientes` `e` join `aseguradoras` `a` on(`e`.`aseguradora_id` = `a`.`id`)) join `juzgados` `j` on(`e`.`juzgado_id` = `j`.`id`)) where `e`.`fecha` = curdate() and `e`.`deleted_at` is null and `a`.`deleted_at` is null and `j`.`deleted_at` is null order by `e`.`created_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_estadisticas_por_estado`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_estadisticas_por_estado` AS select `expedientes`.`estado` AS `estado`,count(0) AS `total` from `expedientes` where `expedientes`.`deleted_at` is null group by `expedientes`.`estado` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_expedientes_completos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_expedientes_completos` AS select lcase(hex(`e`.`id`)) AS `id`,lcase(hex(`e`.`aseguradora_id`)) AS `aseguradora_id`,`a`.`nombre` AS `aseguradora_nombre`,lcase(hex(`e`.`juzgado_id`)) AS `juzgado_id`,`j`.`nombre` AS `juzgado_nombre`,`e`.`abogado` AS `abogado`,`e`.`estado` AS `estado`,`e`.`fecha` AS `fecha`,`e`.`version` AS `version`,`e`.`created_at` AS `created_at`,`e`.`updated_at` AS `updated_at`,`e`.`deleted_at` AS `deleted_at` from ((`expedientes` `e` join `aseguradoras` `a` on(`e`.`aseguradora_id` = `a`.`id`)) join `juzgados` `j` on(`e`.`juzgado_id` = `j`.`id`)) where `e`.`deleted_at` is null and `a`.`deleted_at` is null and `j`.`deleted_at` is null */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

