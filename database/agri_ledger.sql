-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: agri_ledger
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `crop_seasons`
--

DROP TABLE IF EXISTS `crop_seasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crop_seasons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `field_id` bigint unsigned NOT NULL,
  `season` varchar(50) NOT NULL,
  `crop_name` varchar(100) NOT NULL,
  `year` year NOT NULL,
  `sowing_date` date DEFAULT NULL,
  `expected_harvest_date` date DEFAULT NULL,
  `status` enum('PLANNED','SOWN','GROWING','HARVESTED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_crop_season_field` (`field_id`),
  CONSTRAINT `fk_crop_season_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crop_seasons`
--

LOCK TABLES `crop_seasons` WRITE;
/*!40000 ALTER TABLE `crop_seasons` DISABLE KEYS */;
INSERT INTO `crop_seasons` VALUES (1,1,'Kharif','Cotton',2026,'2026-06-15','2026-10-15','HARVESTED','2026-08-26 18:18:39','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `crop_seasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `farmer_payments`
--

DROP TABLE IF EXISTS `farmer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `farmer_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_mode` enum('CASH','BANK','UPI','CHEQUE') NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `farmer_id` (`farmer_id`),
  CONSTRAINT `farmer_payments_ibfk_1` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `farmer_payments`
--

LOCK TABLES `farmer_payments` WRITE;
/*!40000 ALTER TABLE `farmer_payments` DISABLE KEYS */;
INSERT INTO `farmer_payments` VALUES (1,1,'2026-10-16',48697.04,'BANK','SETTLEMENT-2026-001','Final settlement payment to farmer','2026-08-26 19:16:40'),(2,1,'2026-10-16',48697.04,'BANK','SETTLEMENT-2026-001','Final settlement payment to farmer','2026-08-26 19:32:59'),(3,1,'2026-10-16',48697.04,'BANK','SETTLEMENT-2026-001','Final settlement payment to farmer','2026-08-26 19:33:54'),(4,1,'2026-10-16',48697.04,'BANK','SETTLEMENT-2026-001','Final settlement payment to farmer','2026-08-26 19:38:06'),(5,1,'2026-10-16',48697.04,'BANK','SETTLEMENT-2026-001','Final settlement payment to farmer','2026-08-26 19:38:16'),(6,1,'2026-10-16',48697.04,'BANK','SETTLEMENT-2026-001','Final settlement payment to farmer','2026-08-26 19:38:50');
/*!40000 ALTER TABLE `farmer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `farmers`
--

DROP TABLE IF EXISTS `farmers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `farmers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_code` varchar(20) NOT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `village_id` bigint unsigned NOT NULL,
  `bank_account_name` varchar(150) DEFAULT NULL,
  `bank_account_number` varchar(30) DEFAULT NULL,
  `bank_ifsc` varchar(20) DEFAULT NULL,
  `bank_name` varchar(150) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `farmer_code` (`farmer_code`),
  KEY `fk_farmer_village` (`village_id`),
  CONSTRAINT `fk_farmer_village` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `farmers`
--

LOCK TABLES `farmers` WRITE;
/*!40000 ALTER TABLE `farmers` DISABLE KEYS */;
INSERT INTO `farmers` VALUES (1,'FAR-0001','Ramesh Kumar','9876543210',1,'Ramesh Kumar','123456789012','SBIN0001234','State Bank of India','ACTIVE','2026-08-26 17:58:03','2026-08-26 17:58:03');
/*!40000 ALTER TABLE `farmers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fields`
--

DROP TABLE IF EXISTS `fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fields` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `survey_number` varchar(50) DEFAULT NULL,
  `field_village_id` bigint unsigned NOT NULL,
  `area_acres` decimal(10,2) NOT NULL,
  `irrigation_type` varchar(50) DEFAULT NULL,
  `ownership_type` enum('OWNED','LEASED') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_field_farmer` (`farmer_id`),
  KEY `fk_field_village` (`field_village_id`),
  CONSTRAINT `fk_field_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_field_village` FOREIGN KEY (`field_village_id`) REFERENCES `villages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fields`
--

LOCK TABLES `fields` WRITE;
/*!40000 ALTER TABLE `fields` DISABLE KEYS */;
INSERT INTO `fields` VALUES (1,1,'Ramesh Field 1','123/1',1,5.50,'BOREWELL','OWNED','2026-08-26 18:12:32','2026-08-26 18:12:32');
/*!40000 ALTER TABLE `fields` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `harvests`
--

DROP TABLE IF EXISTS `harvests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `harvests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `field_id` bigint unsigned NOT NULL,
  `crop_season_id` bigint unsigned NOT NULL,
  `harvest_date` date NOT NULL,
  `crop_name` varchar(100) NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit` varchar(30) NOT NULL DEFAULT 'KG',
  `quality_grade` varchar(50) DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_harvest_farmer` (`farmer_id`),
  KEY `fk_harvest_field` (`field_id`),
  KEY `fk_harvest_crop` (`crop_season_id`),
  CONSTRAINT `fk_harvest_crop` FOREIGN KEY (`crop_season_id`) REFERENCES `crop_seasons` (`id`),
  CONSTRAINT `fk_harvest_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `fk_harvest_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `harvests`
--

LOCK TABLES `harvests` WRITE;
/*!40000 ALTER TABLE `harvests` DISABLE KEYS */;
INSERT INTO `harvests` VALUES (1,1,1,1,'2026-10-15','Cotton',1000.00,'KG','A','COT-2026-001','Synthetic gold-standard harvest example','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `harvests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_agri_sample`
--

DROP TABLE IF EXISTS `import_agri_sample`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_agri_sample` (
  `sample_id` varchar(30) DEFAULT NULL,
  `village` varchar(150) DEFAULT NULL,
  `household_name` varchar(150) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `land_holding_acres` decimal(10,2) DEFAULT NULL,
  `irrigation` varchar(100) DEFAULT NULL,
  `main_crop` varchar(100) DEFAULT NULL,
  `seed_company_brand` varchar(150) DEFAULT NULL,
  `seed_variety_product` varchar(200) DEFAULT NULL,
  `seed_pack_type` varchar(100) DEFAULT NULL,
  `approx_seed_price_inr` decimal(12,2) DEFAULT NULL,
  `pesticide_category` varchar(100) DEFAULT NULL,
  `pesticide_company` varchar(150) DEFAULT NULL,
  `pesticide_product` varchar(200) DEFAULT NULL,
  `active_ingredient_composition` varchar(300) DEFAULT NULL,
  `approx_pesticide_spend_inr` decimal(12,2) DEFAULT NULL,
  `fertilizer` varchar(150) DEFAULT NULL,
  `fertilizer_grade_type` varchar(100) DEFAULT NULL,
  `approx_fertilizer_spend_inr` decimal(12,2) DEFAULT NULL,
  `estimated_annual_input_spend_inr` decimal(12,2) DEFAULT NULL,
  `data_type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_agri_sample`
--

LOCK TABLES `import_agri_sample` WRITE;
/*!40000 ALTER TABLE `import_agri_sample` DISABLE KEYS */;
INSERT INTO `import_agri_sample` VALUES ('JAD-01-01','Earlapalle','Ravi Reddy',68,'Male','Farmer',3.00,'Canal','Cotton','Kaveri','ATM / KCH-311 BG II','Catalogue reference',900.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',15500.00,'Urea','46-0-0',29000.00,45400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-02','Earlapalle','Suresh Goud',40,'Male','Farmer',3.00,'Canal','Cotton','Mahyco','Commercial Bt hybrids','Catalogue reference',800.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',5000.00,'DAP','18-46-0',4000.00,9800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-03','Earlapalle','Mahesh Yadav',38,'Male','Farmer',8.00,'Canal','Cotton','Nuziveedu','Commercial Bt hybrids','Catalogue reference',850.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',7500.00,'MOP','0-0-60',26500.00,34850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-04','Earlapalle','Ramesh Naik',34,'Male','Agricultural Labourer',3.00,'Borewell + Rainfed','Cotton','JK Agri Genetics','Bt cotton hybrids','Catalogue reference',950.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',25000.00,'SSP','0-16-0 + S',12000.00,37950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-05','Earlapalle','Padma Rao',55,'Female','Farmer',4.00,'Borewell','Cotton','Rasi','Commercial Bt hybrids','Catalogue reference',950.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',20000.00,'NPK','10-26-26',24500.00,45450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-06','Earlapalle','Praveen Kumar',36,'Male','Agricultural Labourer',2.00,'Canal','Cotton','Ajeet Seeds','Bt cotton hybrids','Catalogue reference',1000.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',11000.00,'NPK','12-32-16',29500.00,41500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-07','Earlapalle','Naveen Sharma',68,'Male','Farmer',12.00,'Canal','Maize','Syngenta','NK 6540','Catalogue reference',2200.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',11000.00,'NPK','20-20-0',25000.00,38200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-08','Earlapalle','Rajesh Patel',51,'Male','Farmer',8.00,'Canal','Maize','Syngenta','NK 6240','Catalogue reference',1450.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',8000.00,'Zinc sulphate','Zn source',2500.00,11950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-09','Earlapalle','Venkatesh Chary',31,'Male','Agricultural Labourer',12.00,'Borewell','Maize','Bayer','DEKALB hybrids','Catalogue reference',1900.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',15000.00,'Boron','B source',6000.00,22900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-10','Earlapalle','Sunitha Gowda',46,'Female','Farmer',8.00,'Borewell + Rainfed','Maize','Advanta','Commercial maize hybrids','Catalogue reference',1000.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',20500.00,'Water-soluble NPK','Various grades',18000.00,39500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-11','Earlapalle','Anil Raju',66,'Male','Farmer',10.00,'Rainfed','Maize','Kaveri','Commercial maize hybrids','Catalogue reference',2100.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',9500.00,'Biofertilizer','Rhizobium',28500.00,40100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-12','Earlapalle','Arun Malla',43,'Male','Agricultural Labourer',2.00,'Borewell + Rainfed','Maize','Pioneer/Corteva','Commercial maize hybrids','Catalogue reference',1550.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',23000.00,'Biofertilizer','Azotobacter',4500.00,29050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-13','Earlapalle','Kiran Bandi',54,'Male','Agricultural Labourer',3.00,'Canal','Paddy','Bayer','Arize hybrid rice range','Catalogue reference',1150.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',24000.00,'Urea','46-0-0',8500.00,33650.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-14','Earlapalle','Mohan Kolli',68,'Male','Farmer',3.00,'Canal','Paddy','Syngenta','Hybrid rice range','Catalogue reference',850.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',18500.00,'DAP','18-46-0',20000.00,39350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-15','Earlapalle','Padma Madduri',55,'Female','Farmer',6.00,'Canal','Paddy','Kaveri','Hybrid/improved rice range','Catalogue reference',1600.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',9500.00,'MOP','0-0-60',14500.00,25600.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-16','Earlapalle','Naresh Palle',42,'Male','Farmer',8.00,'Rainfed','Paddy','Mahyco','Hybrid rice range','Catalogue reference',1400.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',12000.00,'SSP','0-16-0 + S',21000.00,34400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-17','Earlapalle','Shankar Mekala',64,'Male','Farmer',4.00,'Canal','Paddy','JK Agri Genetics','Rice varieties/hybrids','Catalogue reference',1250.00,'Insecticide','FMC','Fame','Flubendiamide',5000.00,'NPK','10-26-26',25000.00,31250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-18','Earlapalle','Ganesh Konda',54,'Male','Farmer',8.00,'Borewell + Rainfed','Soybean','MAHYCO','Improved soybean varieties','Catalogue reference',3100.00,'Insecticide','Corteva','Delegate','Spinetoram',14500.00,'NPK','12-32-16',4500.00,22100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-19','Earlapalle','Vijay Dandu',28,'Male','Farmer',2.00,'Rainfed','Soybean','NSC','Certified soybean seed','Catalogue reference',2100.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',3000.00,'NPK','20-20-0',28000.00,33100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-01-20','Earlapalle','Sunitha Janga',55,'Female','Agricultural Labourer',2.00,'Canal','Groundnut','NSC','Certified groundnut varieties','Catalogue reference',2000.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',6500.00,'Zinc sulphate','Zn source',12500.00,21000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-01','Gangapur','Suresh Yadav',36,'Male','Farmer',2.00,'Borewell','Cotton','Ajeet Seeds','Bt cotton hybrids','Catalogue reference',800.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',22000.00,'DAP','18-46-0',4500.00,27300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-02','Gangapur','Mahesh Naik',41,'Male','Farmer',8.00,'Borewell','Maize','Syngenta','NK 6540','Catalogue reference',2000.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',15000.00,'MOP','0-0-60',7500.00,24500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-03','Gangapur','Ramesh Rao',31,'Male','Farmer',10.00,'Borewell + Rainfed','Maize','Syngenta','NK 6240','Catalogue reference',1000.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',17500.00,'SSP','0-16-0 + S',18000.00,36500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-04','Gangapur','Srikanth Kumar',66,'Male','Agricultural Labourer',2.00,'Borewell + Rainfed','Maize','Bayer','DEKALB hybrids','Catalogue reference',1800.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',4500.00,'NPK','10-26-26',3500.00,9800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-05','Gangapur','Kavitha Sharma',37,'Female','Agricultural Labourer',12.00,'Canal','Maize','Advanta','Commercial maize hybrids','Catalogue reference',1750.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',2000.00,'NPK','12-32-16',30000.00,33750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-06','Gangapur','Naveen Patel',29,'Male','Farmer',2.00,'Canal','Maize','Kaveri','Commercial maize hybrids','Catalogue reference',1850.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',14500.00,'NPK','20-20-0',20500.00,36850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-07','Gangapur','Rajesh Chary',57,'Male','Farmer',5.00,'Borewell','Maize','Pioneer/Corteva','Commercial maize hybrids','Catalogue reference',2000.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',16000.00,'Zinc sulphate','Zn source',23500.00,41500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-08','Gangapur','Venkatesh Gowda',54,'Male','Farmer',3.00,'Canal','Paddy','Bayer','Arize hybrid rice range','Catalogue reference',1100.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',8000.00,'Boron','B source',25000.00,34100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-09','Gangapur','Srinivas Raju',59,'Male','Agricultural Labourer',10.00,'Borewell + Rainfed','Paddy','Syngenta','Hybrid rice range','Catalogue reference',1250.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',8000.00,'Water-soluble NPK','Various grades',2500.00,11750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-10','Gangapur','Lakshmi Malla',56,'Female','Farmer',5.00,'Borewell','Paddy','Kaveri','Hybrid/improved rice range','Catalogue reference',650.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',22500.00,'Biofertilizer','Rhizobium',22500.00,45650.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-11','Gangapur','Arun Bandi',47,'Male','Farmer',2.00,'Borewell','Paddy','Mahyco','Hybrid rice range','Catalogue reference',1600.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',16000.00,'Biofertilizer','Azotobacter',28500.00,46100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-12','Gangapur','Kiran Kolli',31,'Male','Agricultural Labourer',3.00,'Borewell','Paddy','JK Agri Genetics','Rice varieties/hybrids','Catalogue reference',1350.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',15000.00,'Urea','46-0-0',22000.00,38350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-13','Gangapur','Mohan Madduri',48,'Male','Farmer',6.00,'Borewell + Rainfed','Soybean','MAHYCO','Improved soybean varieties','Catalogue reference',2850.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',15000.00,'DAP','18-46-0',25000.00,42850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-14','Gangapur','Raghu Palle',36,'Male','Farmer',12.00,'Rainfed','Soybean','NSC','Certified soybean seed','Catalogue reference',2000.00,'Insecticide','FMC','Fame','Flubendiamide',8000.00,'MOP','0-0-60',28000.00,38000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-15','Gangapur','Kavitha Mekala',51,'Female','Farmer',12.00,'Canal','Groundnut','NSC','Certified groundnut varieties','Catalogue reference',2000.00,'Insecticide','Corteva','Delegate','Spinetoram',18000.00,'SSP','0-16-0 + S',4000.00,24000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-16','Gangapur','Shankar Konda',57,'Male','Farmer',6.00,'Canal','Groundnut','Kaveri','Groundnut varieties','Catalogue reference',3900.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',8500.00,'NPK','10-26-26',14000.00,26400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-17','Gangapur','Ganesh Dandu',59,'Male','Farmer',6.00,'Rainfed','Sunflower','Syngenta','Hybrid sunflower range','Catalogue reference',900.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',6000.00,'NPK','12-32-16',6500.00,13400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-18','Gangapur','Vijay Janga',63,'Male','Farmer',3.00,'Rainfed','Sunflower','Kaveri','Hybrid sunflower range','Catalogue reference',900.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',16000.00,'NPK','20-20-0',5500.00,22400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-19','Gangapur','Harish Reddy',47,'Male','Farmer',5.00,'Borewell','Tur','NSC/State agencies','Improved tur varieties','Catalogue reference',500.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',6000.00,'Zinc sulphate','Zn source',22500.00,29000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-02-20','Gangapur','Lakshmi Goud',54,'Female','Farmer',12.00,'Rainfed','Moong','NSC/State agencies','Improved moong varieties','Catalogue reference',1550.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',4000.00,'Boron','B source',21500.00,27050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-01','Gollapalle','Mahesh Rao',42,'Male','Farmer',2.00,'Borewell + Rainfed','Maize','Kaveri','Commercial maize hybrids','Catalogue reference',1250.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',18500.00,'MOP','0-0-60',5500.00,25250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-02','Gollapalle','Ramesh Kumar',41,'Male','Farmer',12.00,'Canal','Maize','Pioneer/Corteva','Commercial maize hybrids','Catalogue reference',1800.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',23500.00,'SSP','0-16-0 + S',29000.00,54300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-03','Gollapalle','Srikanth Sharma',43,'Male','Farmer',2.00,'Canal','Paddy','Bayer','Arize hybrid rice range','Catalogue reference',550.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',6000.00,'NPK','10-26-26',13500.00,20050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-04','Gollapalle','Praveen Patel',41,'Male','Farmer',6.00,'Borewell + Rainfed','Paddy','Syngenta','Hybrid rice range','Catalogue reference',1500.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',21000.00,'NPK','12-32-16',16000.00,38500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-05','Gollapalle','Bhavani Chary',36,'Female','Agricultural Labourer',2.00,'Borewell + Rainfed','Paddy','Kaveri','Hybrid/improved rice range','Catalogue reference',650.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',8500.00,'NPK','20-20-0',29000.00,38150.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-06','Gollapalle','Rajesh Gowda',60,'Male','Agricultural Labourer',3.00,'Borewell + Rainfed','Paddy','Mahyco','Hybrid rice range','Catalogue reference',1400.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',2500.00,'Zinc sulphate','Zn source',22000.00,25900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-07','Gollapalle','Venkatesh Raju',48,'Male','Farmer',12.00,'Borewell + Rainfed','Paddy','JK Agri Genetics','Rice varieties/hybrids','Catalogue reference',1300.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',21500.00,'Boron','B source',11000.00,33800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-08','Gollapalle','Srinivas Malla',37,'Male','Farmer',4.00,'Canal','Soybean','MAHYCO','Improved soybean varieties','Catalogue reference',3250.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',12000.00,'Water-soluble NPK','Various grades',16500.00,31750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-09','Gollapalle','Anil Bandi',54,'Male','Farmer',5.00,'Borewell + Rainfed','Soybean','NSC','Certified soybean seed','Catalogue reference',3450.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',14000.00,'Biofertilizer','Rhizobium',24500.00,41950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-10','Gollapalle','Anitha Kolli',47,'Female','Agricultural Labourer',10.00,'Borewell + Rainfed','Groundnut','NSC','Certified groundnut varieties','Catalogue reference',2250.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',7500.00,'Biofertilizer','Azotobacter',7500.00,17250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-11','Gollapalle','Kiran Madduri',36,'Male','Farmer',8.00,'Rainfed','Groundnut','Kaveri','Groundnut varieties','Catalogue reference',4200.00,'Insecticide','FMC','Fame','Flubendiamide',4500.00,'Urea','46-0-0',8500.00,17200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-12','Gollapalle','Mohan Palle',31,'Male','Farmer',6.00,'Borewell','Sunflower','Syngenta','Hybrid sunflower range','Catalogue reference',700.00,'Insecticide','Corteva','Delegate','Spinetoram',20500.00,'DAP','18-46-0',16000.00,37200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-13','Gollapalle','Raghu Mekala',56,'Male','Farmer',10.00,'Borewell','Sunflower','Kaveri','Hybrid sunflower range','Catalogue reference',1350.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',14500.00,'MOP','0-0-60',6000.00,21850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-14','Gollapalle','Naresh Konda',67,'Male','Agricultural Labourer',5.00,'Canal','Tur','NSC/State agencies','Improved tur varieties','Catalogue reference',550.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',18000.00,'SSP','0-16-0 + S',24500.00,43050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-15','Gollapalle','Bhavani Dandu',38,'Female','Farmer',4.00,'Canal','Moong','NSC/State agencies','Improved moong varieties','Catalogue reference',1050.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',14500.00,'NPK','10-26-26',28000.00,43550.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-16','Gollapalle','Ganesh Janga',58,'Male','Agricultural Labourer',3.00,'Borewell','Urad','NSC/State agencies','Improved urad varieties','Catalogue reference',950.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',2000.00,'NPK','12-32-16',6000.00,8950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-17','Gollapalle','Vijay Reddy',63,'Male','Farmer',3.00,'Canal','Chickpea','NSC/State agencies','Improved gram varieties','Catalogue reference',1800.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',15000.00,'NPK','20-20-0',19500.00,36300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-18','Gollapalle','Harish Goud',41,'Male','Farmer',2.00,'Canal','Jowar','Kaveri/State agencies','Hybrid/improved jowar','Catalogue reference',400.00,'Bio-pesticide','Multiple brands','Beauveria','Beauveria bassiana',13500.00,'Zinc sulphate','Zn source',15000.00,28900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-19','Gollapalle','Ravi Yadav',29,'Male','Farmer',8.00,'Canal','Bajra','Kaveri/State agencies','Hybrid bajra','Catalogue reference',300.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',19000.00,'Boron','B source',28000.00,47300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-03-20','Gollapalle','Anitha Naik',30,'Female','Farmer',12.00,'Rainfed','Ragi','NSC/State agencies','Improved ragi','Catalogue reference',450.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',25000.00,'Water-soluble NPK','Various grades',27000.00,52450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-01','Goplapur (Kalan)','Ramesh Sharma',47,'Male','Farmer',3.00,'Canal','Paddy','Mahyco','Hybrid rice range','Catalogue reference',1600.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',5500.00,'SSP','0-16-0 + S',27500.00,34600.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-02','Goplapur (Kalan)','Srikanth Patel',36,'Male','Agricultural Labourer',10.00,'Borewell','Paddy','JK Agri Genetics','Rice varieties/hybrids','Catalogue reference',850.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',13500.00,'NPK','10-26-26',15500.00,29850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-03','Goplapur (Kalan)','Praveen Chary',44,'Male','Farmer',4.00,'Borewell + Rainfed','Soybean','MAHYCO','Improved soybean varieties','Catalogue reference',1850.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',20500.00,'NPK','12-32-16',16500.00,38850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-04','Goplapur (Kalan)','Naveen Gowda',58,'Male','Agricultural Labourer',3.00,'Canal','Soybean','NSC','Certified soybean seed','Catalogue reference',3050.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',21500.00,'NPK','20-20-0',29000.00,53550.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-05','Goplapur (Kalan)','Sandhya Raju',34,'Female','Farmer',5.00,'Canal','Groundnut','NSC','Certified groundnut varieties','Catalogue reference',3400.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',4500.00,'Zinc sulphate','Zn source',29000.00,36900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-06','Goplapur (Kalan)','Venkatesh Malla',32,'Male','Farmer',8.00,'Borewell','Groundnut','Kaveri','Groundnut varieties','Catalogue reference',3050.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',8500.00,'Boron','B source',6500.00,18050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-07','Goplapur (Kalan)','Srinivas Bandi',39,'Male','Farmer',8.00,'Canal','Sunflower','Syngenta','Hybrid sunflower range','Catalogue reference',1000.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',14000.00,'Water-soluble NPK','Various grades',4000.00,19000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-08','Goplapur (Kalan)','Anil Kolli',65,'Male','Farmer',3.00,'Canal','Sunflower','Kaveri','Hybrid sunflower range','Catalogue reference',1350.00,'Insecticide','FMC','Fame','Flubendiamide',9000.00,'Biofertilizer','Rhizobium',13000.00,23350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-09','Goplapur (Kalan)','Arun Madduri',36,'Male','Farmer',3.00,'Canal','Tur','NSC/State agencies','Improved tur varieties','Catalogue reference',600.00,'Insecticide','Corteva','Delegate','Spinetoram',9000.00,'Biofertilizer','Azotobacter',23500.00,33100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-10','Goplapur (Kalan)','Swathi Palle',39,'Female','Agricultural Labourer',8.00,'Borewell','Moong','NSC/State agencies','Improved moong varieties','Catalogue reference',1200.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',15500.00,'Urea','46-0-0',18500.00,35200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-11','Goplapur (Kalan)','Mohan Mekala',29,'Male','Farmer',2.00,'Canal','Urad','NSC/State agencies','Improved urad varieties','Catalogue reference',1450.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',14500.00,'DAP','18-46-0',11500.00,27450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-12','Goplapur (Kalan)','Raghu Konda',33,'Male','Agricultural Labourer',5.00,'Borewell + Rainfed','Chickpea','NSC/State agencies','Improved gram varieties','Catalogue reference',2100.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',9000.00,'MOP','0-0-60',8500.00,19600.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-13','Goplapur (Kalan)','Naresh Dandu',34,'Male','Agricultural Labourer',2.00,'Borewell + Rainfed','Jowar','Kaveri/State agencies','Hybrid/improved jowar','Catalogue reference',750.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',4500.00,'SSP','0-16-0 + S',12000.00,17250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-14','Goplapur (Kalan)','Shankar Janga',63,'Male','Farmer',12.00,'Borewell + Rainfed','Bajra','Kaveri/State agencies','Hybrid bajra','Catalogue reference',250.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',5500.00,'NPK','10-26-26',26000.00,31750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-15','Goplapur (Kalan)','Sandhya Reddy',32,'Female','Farmer',3.00,'Rainfed','Ragi','NSC/State agencies','Improved ragi','Catalogue reference',450.00,'Bio-pesticide','Multiple brands','Beauveria','Beauveria bassiana',19000.00,'NPK','12-32-16',9500.00,28950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-16','Goplapur (Kalan)','Vijay Goud',42,'Male','Farmer',3.00,'Rainfed','Sesame','NSC/State agencies','Improved sesame','Catalogue reference',350.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',24000.00,'NPK','20-20-0',15500.00,39850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-17','Goplapur (Kalan)','Harish Yadav',67,'Male','Farmer',3.00,'Canal','Mustard','Private/State agencies','Improved mustard','Catalogue reference',350.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',14500.00,'Zinc sulphate','Zn source',13000.00,27850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-18','Goplapur (Kalan)','Ravi Naik',37,'Male','Agricultural Labourer',12.00,'Canal','Safflower','State/NSC','Improved safflower','Catalogue reference',950.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',5500.00,'Boron','B source',18500.00,24950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-19','Goplapur (Kalan)','Suresh Rao',34,'Male','Farmer',8.00,'Rainfed','Castor','Private seed companies','Hybrid castor','Catalogue reference',900.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',10500.00,'Water-soluble NPK','Various grades',5000.00,16400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-04-20','Goplapur (Kalan)','Swathi Kumar',32,'Female','Agricultural Labourer',10.00,'Canal','Niger','State/NSC','Improved niger','Catalogue reference',400.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',22000.00,'Biofertilizer','Rhizobium',6500.00,28900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-01','Jadcherla (CT)','Srikanth Chary',42,'Male','Farmer',10.00,'Borewell','Groundnut','Kaveri','Groundnut varieties','Catalogue reference',3350.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',2000.00,'NPK','10-26-26',28500.00,33850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-02','Jadcherla (CT)','Praveen Gowda',67,'Male','Farmer',5.00,'Canal','Sunflower','Syngenta','Hybrid sunflower range','Catalogue reference',650.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',24000.00,'NPK','12-32-16',4500.00,29150.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-03','Jadcherla (CT)','Naveen Raju',57,'Male','Agricultural Labourer',2.00,'Borewell + Rainfed','Sunflower','Kaveri','Hybrid sunflower range','Catalogue reference',900.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',16000.00,'NPK','20-20-0',16500.00,33400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-04','Jadcherla (CT)','Rajesh Malla',61,'Male','Farmer',2.00,'Rainfed','Tur','NSC/State agencies','Improved tur varieties','Catalogue reference',1450.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',24000.00,'Zinc sulphate','Zn source',10500.00,35950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-05','Jadcherla (CT)','Madhavi Bandi',34,'Female','Farmer',3.00,'Canal','Moong','NSC/State agencies','Improved moong varieties','Catalogue reference',1050.00,'Insecticide','FMC','Fame','Flubendiamide',24500.00,'Boron','B source',19000.00,44550.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-06','Jadcherla (CT)','Srinivas Kolli',60,'Male','Farmer',8.00,'Rainfed','Urad','NSC/State agencies','Improved urad varieties','Catalogue reference',1200.00,'Insecticide','Corteva','Delegate','Spinetoram',7000.00,'Water-soluble NPK','Various grades',12500.00,20700.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-07','Jadcherla (CT)','Anil Madduri',42,'Male','Farmer',6.00,'Rainfed','Chickpea','NSC/State agencies','Improved gram varieties','Catalogue reference',1700.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',9500.00,'Biofertilizer','Rhizobium',25000.00,36200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-08','Jadcherla (CT)','Arun Palle',58,'Male','Farmer',12.00,'Borewell + Rainfed','Jowar','Kaveri/State agencies','Hybrid/improved jowar','Catalogue reference',650.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',6500.00,'Biofertilizer','Azotobacter',26000.00,33150.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-09','Jadcherla (CT)','Kiran Mekala',68,'Male','Agricultural Labourer',5.00,'Borewell','Bajra','Kaveri/State agencies','Hybrid bajra','Catalogue reference',500.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',11000.00,'Urea','46-0-0',26000.00,37500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-10','Jadcherla (CT)','Sujatha Konda',62,'Female','Farmer',10.00,'Borewell + Rainfed','Ragi','NSC/State agencies','Improved ragi','Catalogue reference',400.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',8000.00,'DAP','18-46-0',17000.00,25400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-11','Jadcherla (CT)','Raghu Dandu',57,'Male','Farmer',6.00,'Canal','Sesame','NSC/State agencies','Improved sesame','Catalogue reference',400.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',19000.00,'MOP','0-0-60',17000.00,36400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-12','Jadcherla (CT)','Naresh Janga',58,'Male','Farmer',8.00,'Rainfed','Mustard','Private/State agencies','Improved mustard','Catalogue reference',300.00,'Bio-pesticide','Multiple brands','Beauveria','Beauveria bassiana',14000.00,'SSP','0-16-0 + S',9000.00,23300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-13','Jadcherla (CT)','Shankar Reddy',28,'Male','Farmer',4.00,'Borewell + Rainfed','Safflower','State/NSC','Improved safflower','Catalogue reference',1000.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',16000.00,'NPK','10-26-26',16000.00,33000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-14','Jadcherla (CT)','Ganesh Goud',65,'Male','Farmer',5.00,'Borewell','Castor','Private seed companies','Hybrid castor','Catalogue reference',600.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',2000.00,'NPK','12-32-16',28000.00,30600.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-15','Jadcherla (CT)','Madhavi Yadav',68,'Female','Farmer',3.00,'Borewell + Rainfed','Niger','State/NSC','Improved niger','Catalogue reference',500.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',15000.00,'NPK','20-20-0',28000.00,43500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-16','Jadcherla (CT)','Harish Naik',63,'Male','Farmer',6.00,'Borewell + Rainfed','Tomato','Syngenta','Commercial hybrids','Catalogue reference',1850.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',10000.00,'Zinc sulphate','Zn source',7500.00,19350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-17','Jadcherla (CT)','Ravi Rao',39,'Male','Farmer',6.00,'Canal','Chilli','Syngenta','Commercial hot-pepper hybrids','Catalogue reference',1250.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',9500.00,'Boron','B source',28500.00,39250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-18','Jadcherla (CT)','Suresh Kumar',66,'Male','Farmer',10.00,'Rainfed','Okra','Syngenta','Commercial hybrids','Catalogue reference',700.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',3000.00,'Water-soluble NPK','Various grades',7500.00,11200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-19','Jadcherla (CT)','Mahesh Sharma',31,'Male','Farmer',2.00,'Borewell + Rainfed','Cucumber','Syngenta','Commercial hybrids','Catalogue reference',850.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',23000.00,'Biofertilizer','Rhizobium',27500.00,51350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-05-20','Jadcherla (CT)','Sujatha Patel',37,'Female','Agricultural Labourer',5.00,'Borewell','Cabbage','Syngenta','Commercial hybrids','Catalogue reference',850.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',8500.00,'Biofertilizer','Azotobacter',16500.00,25850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-01','Khanapur','Praveen Raju',34,'Male','Agricultural Labourer',2.00,'Canal','Urad','NSC/State agencies','Improved urad varieties','Catalogue reference',1250.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',21000.00,'NPK','12-32-16',30000.00,52250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-02','Khanapur','Naveen Malla',45,'Male','Farmer',6.00,'Borewell','Chickpea','NSC/State agencies','Improved gram varieties','Catalogue reference',1500.00,'Insecticide','FMC','Fame','Flubendiamide',11500.00,'NPK','20-20-0',13000.00,26000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-03','Khanapur','Rajesh Bandi',64,'Male','Farmer',6.00,'Borewell','Jowar','Kaveri/State agencies','Hybrid/improved jowar','Catalogue reference',300.00,'Insecticide','Corteva','Delegate','Spinetoram',3000.00,'Zinc sulphate','Zn source',6000.00,9300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-04','Khanapur','Venkatesh Kolli',51,'Male','Farmer',12.00,'Borewell','Bajra','Kaveri/State agencies','Hybrid bajra','Catalogue reference',600.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',3500.00,'Boron','B source',11000.00,15100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-05','Khanapur','Sunitha Madduri',44,'Female','Farmer',6.00,'Borewell','Ragi','NSC/State agencies','Improved ragi','Catalogue reference',600.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',25000.00,'Water-soluble NPK','Various grades',16500.00,42100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-06','Khanapur','Anil Palle',60,'Male','Agricultural Labourer',4.00,'Canal','Sesame','NSC/State agencies','Improved sesame','Catalogue reference',450.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',9500.00,'Biofertilizer','Rhizobium',19000.00,28950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-07','Khanapur','Arun Mekala',55,'Male','Farmer',3.00,'Borewell + Rainfed','Mustard','Private/State agencies','Improved mustard','Catalogue reference',350.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',7000.00,'Biofertilizer','Azotobacter',3500.00,10850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-08','Khanapur','Kiran Konda',44,'Male','Agricultural Labourer',10.00,'Borewell + Rainfed','Safflower','State/NSC','Improved safflower','Catalogue reference',800.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',8500.00,'Urea','46-0-0',3500.00,12800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-09','Khanapur','Mohan Dandu',61,'Male','Farmer',10.00,'Canal','Castor','Private seed companies','Hybrid castor','Catalogue reference',1100.00,'Bio-pesticide','Multiple brands','Beauveria','Beauveria bassiana',17000.00,'DAP','18-46-0',16000.00,34100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-10','Khanapur','Padma Janga',37,'Female','Farmer',6.00,'Borewell + Rainfed','Niger','State/NSC','Improved niger','Catalogue reference',650.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',14000.00,'MOP','0-0-60',8500.00,23150.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-11','Khanapur','Naresh Reddy',48,'Male','Farmer',6.00,'Borewell','Tomato','Syngenta','Commercial hybrids','Catalogue reference',1450.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',21000.00,'SSP','0-16-0 + S',29000.00,51450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-12','Khanapur','Shankar Goud',43,'Male','Agricultural Labourer',4.00,'Canal','Chilli','Syngenta','Commercial hot-pepper hybrids','Catalogue reference',300.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',5500.00,'NPK','10-26-26',4000.00,9800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-13','Khanapur','Ganesh Yadav',62,'Male','Agricultural Labourer',4.00,'Borewell','Okra','Syngenta','Commercial hybrids','Catalogue reference',450.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',12500.00,'NPK','12-32-16',12500.00,25450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-14','Khanapur','Vijay Naik',41,'Male','Farmer',8.00,'Canal','Cucumber','Syngenta','Commercial hybrids','Catalogue reference',750.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',8000.00,'NPK','20-20-0',3000.00,11750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-15','Khanapur','Sunitha Rao',56,'Female','Agricultural Labourer',6.00,'Rainfed','Cabbage','Syngenta','Commercial hybrids','Catalogue reference',1100.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',20000.00,'Zinc sulphate','Zn source',20500.00,41600.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-16','Khanapur','Ravi Kumar',68,'Male','Farmer',3.00,'Canal','Cauliflower','Syngenta','Commercial hybrids','Catalogue reference',700.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',17000.00,'Boron','B source',5000.00,22700.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-17','Khanapur','Suresh Sharma',36,'Male','Farmer',10.00,'Borewell','Watermelon','Syngenta','Commercial hybrids','Catalogue reference',2200.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',11500.00,'Water-soluble NPK','Various grades',27000.00,40700.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-18','Khanapur','Mahesh Patel',33,'Male','Farmer',5.00,'Borewell','Sweet corn','Syngenta','Commercial hybrids','Catalogue reference',1900.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',20500.00,'Biofertilizer','Rhizobium',7500.00,29900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-19','Khanapur','Ramesh Chary',68,'Male','Agricultural Labourer',8.00,'Borewell','Cotton','Kaveri','ATM / KCH-311 BG II','Catalogue reference',950.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',25000.00,'Biofertilizer','Azotobacter',25500.00,51450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-06-20','Khanapur','Padma Gowda',30,'Female','Farmer',8.00,'Borewell + Rainfed','Cotton','Mahyco','Commercial Bt hybrids','Catalogue reference',850.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',23500.00,'Urea','46-0-0',4500.00,28850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-01','Kishtaram','Naveen Bandi',47,'Male','Agricultural Labourer',2.00,'Rainfed','Sesame','NSC/State agencies','Improved sesame','Catalogue reference',400.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',3500.00,'NPK','20-20-0',22500.00,26400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-02','Kishtaram','Rajesh Kolli',33,'Male','Farmer',12.00,'Rainfed','Mustard','Private/State agencies','Improved mustard','Catalogue reference',350.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',10500.00,'Zinc sulphate','Zn source',11000.00,21850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-03','Kishtaram','Venkatesh Madduri',41,'Male','Farmer',2.00,'Borewell + Rainfed','Safflower','State/NSC','Improved safflower','Catalogue reference',650.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',7000.00,'Boron','B source',21000.00,28650.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-04','Kishtaram','Srinivas Palle',43,'Male','Farmer',12.00,'Borewell + Rainfed','Castor','Private seed companies','Hybrid castor','Catalogue reference',1200.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',2500.00,'Water-soluble NPK','Various grades',21500.00,25200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-05','Kishtaram','Lakshmi Mekala',53,'Female','Agricultural Labourer',5.00,'Canal','Niger','State/NSC','Improved niger','Catalogue reference',750.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',4000.00,'Biofertilizer','Rhizobium',27000.00,31750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-06','Kishtaram','Arun Konda',61,'Male','Farmer',6.00,'Borewell','Tomato','Syngenta','Commercial hybrids','Catalogue reference',1300.00,'Bio-pesticide','Multiple brands','Beauveria','Beauveria bassiana',15500.00,'Biofertilizer','Azotobacter',21500.00,38300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-07','Kishtaram','Kiran Dandu',42,'Male','Farmer',6.00,'Rainfed','Chilli','Syngenta','Commercial hot-pepper hybrids','Catalogue reference',1650.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',20500.00,'Urea','46-0-0',9500.00,31650.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-08','Kishtaram','Mohan Janga',60,'Male','Farmer',6.00,'Rainfed','Okra','Syngenta','Commercial hybrids','Catalogue reference',500.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',9000.00,'DAP','18-46-0',21500.00,31000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-09','Kishtaram','Raghu Reddy',30,'Male','Farmer',10.00,'Canal','Cucumber','Syngenta','Commercial hybrids','Catalogue reference',450.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',13500.00,'MOP','0-0-60',5500.00,19450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-10','Kishtaram','Kavitha Goud',55,'Female','Farmer',3.00,'Rainfed','Cabbage','Syngenta','Commercial hybrids','Catalogue reference',400.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',2000.00,'SSP','0-16-0 + S',5000.00,7400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-11','Kishtaram','Shankar Yadav',33,'Male','Farmer',12.00,'Rainfed','Cauliflower','Syngenta','Commercial hybrids','Catalogue reference',1100.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',16000.00,'NPK','10-26-26',28500.00,45600.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-12','Kishtaram','Ganesh Naik',46,'Male','Farmer',5.00,'Rainfed','Watermelon','Syngenta','Commercial hybrids','Catalogue reference',2500.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',8000.00,'NPK','12-32-16',26500.00,37000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-13','Kishtaram','Vijay Rao',60,'Male','Farmer',8.00,'Borewell','Sweet corn','Syngenta','Commercial hybrids','Catalogue reference',1300.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',11000.00,'NPK','20-20-0',15000.00,27300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-14','Kishtaram','Harish Kumar',48,'Male','Agricultural Labourer',3.00,'Rainfed','Cotton','Kaveri','ATM / KCH-311 BG II','Catalogue reference',850.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',14500.00,'Zinc sulphate','Zn source',11000.00,26350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-15','Kishtaram','Lakshmi Sharma',68,'Female','Farmer',10.00,'Canal','Cotton','Mahyco','Commercial Bt hybrids','Catalogue reference',850.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',8000.00,'Boron','B source',29000.00,37850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-16','Kishtaram','Suresh Patel',65,'Male','Farmer',2.00,'Canal','Cotton','Nuziveedu','Commercial Bt hybrids','Catalogue reference',950.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',9000.00,'Water-soluble NPK','Various grades',12000.00,21950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-17','Kishtaram','Mahesh Chary',31,'Male','Farmer',2.00,'Rainfed','Cotton','JK Agri Genetics','Bt cotton hybrids','Catalogue reference',850.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',5000.00,'Biofertilizer','Rhizobium',6000.00,11850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-18','Kishtaram','Ramesh Gowda',35,'Male','Agricultural Labourer',4.00,'Rainfed','Cotton','Rasi','Commercial Bt hybrids','Catalogue reference',800.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',12000.00,'Biofertilizer','Azotobacter',22500.00,35300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-19','Kishtaram','Srikanth Raju',32,'Male','Farmer',8.00,'Rainfed','Cotton','Ajeet Seeds','Bt cotton hybrids','Catalogue reference',850.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',14500.00,'Urea','46-0-0',9000.00,24350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-07-20','Kishtaram','Kavitha Malla',37,'Female','Farmer',12.00,'Canal','Maize','Syngenta','NK 6540','Catalogue reference',1400.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',5000.00,'DAP','18-46-0',12000.00,18400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-01','Kodgal','Rajesh Madduri',37,'Male','Farmer',2.00,'Canal','Tomato','Syngenta','Commercial hybrids','Catalogue reference',2200.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',13500.00,'Zinc sulphate','Zn source',12000.00,27700.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-02','Kodgal','Venkatesh Palle',67,'Male','Farmer',3.00,'Rainfed','Chilli','Syngenta','Commercial hot-pepper hybrids','Catalogue reference',750.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',14500.00,'Boron','B source',13500.00,28750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-03','Kodgal','Srinivas Mekala',58,'Male','Farmer',10.00,'Borewell','Okra','Syngenta','Commercial hybrids','Catalogue reference',200.00,'Bio-pesticide','Multiple brands','Beauveria','Beauveria bassiana',20000.00,'Water-soluble NPK','Various grades',16000.00,36200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-04','Kodgal','Anil Konda',47,'Male','Agricultural Labourer',5.00,'Borewell + Rainfed','Cucumber','Syngenta','Commercial hybrids','Catalogue reference',750.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',6500.00,'Biofertilizer','Rhizobium',12500.00,19750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-05','Kodgal','Anitha Dandu',48,'Female','Farmer',12.00,'Rainfed','Cabbage','Syngenta','Commercial hybrids','Catalogue reference',1100.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',9500.00,'Biofertilizer','Azotobacter',5500.00,16100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-06','Kodgal','Kiran Janga',47,'Male','Farmer',12.00,'Rainfed','Cauliflower','Syngenta','Commercial hybrids','Catalogue reference',550.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',24000.00,'Urea','46-0-0',9500.00,34050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-07','Kodgal','Mohan Reddy',49,'Male','Farmer',8.00,'Borewell','Watermelon','Syngenta','Commercial hybrids','Catalogue reference',2400.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',24000.00,'DAP','18-46-0',18000.00,44400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-08','Kodgal','Raghu Goud',58,'Male','Agricultural Labourer',12.00,'Rainfed','Sweet corn','Syngenta','Commercial hybrids','Catalogue reference',1250.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',24000.00,'MOP','0-0-60',28500.00,53750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-09','Kodgal','Naresh Yadav',30,'Male','Agricultural Labourer',10.00,'Borewell','Cotton','Kaveri','ATM / KCH-311 BG II','Catalogue reference',850.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',18000.00,'SSP','0-16-0 + S',20500.00,39350.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-10','Kodgal','Bhavani Naik',53,'Female','Farmer',4.00,'Rainfed','Cotton','Mahyco','Commercial Bt hybrids','Catalogue reference',900.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',6500.00,'NPK','10-26-26',22000.00,29400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-11','Kodgal','Ganesh Rao',44,'Male','Farmer',6.00,'Canal','Cotton','Nuziveedu','Commercial Bt hybrids','Catalogue reference',850.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',21000.00,'NPK','12-32-16',11000.00,32850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-12','Kodgal','Vijay Kumar',48,'Male','Farmer',10.00,'Canal','Cotton','JK Agri Genetics','Bt cotton hybrids','Catalogue reference',800.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',19000.00,'NPK','20-20-0',30000.00,49800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-13','Kodgal','Harish Sharma',46,'Male','Agricultural Labourer',4.00,'Borewell + Rainfed','Cotton','Rasi','Commercial Bt hybrids','Catalogue reference',800.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',2000.00,'Zinc sulphate','Zn source',9000.00,11800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-14','Kodgal','Ravi Patel',68,'Male','Farmer',2.00,'Borewell + Rainfed','Cotton','Ajeet Seeds','Bt cotton hybrids','Catalogue reference',950.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',21000.00,'Boron','B source',13000.00,34950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-15','Kodgal','Anitha Chary',49,'Female','Farmer',10.00,'Rainfed','Maize','Syngenta','NK 6540','Catalogue reference',1750.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',20000.00,'Water-soluble NPK','Various grades',3500.00,25250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-16','Kodgal','Mahesh Gowda',41,'Male','Agricultural Labourer',12.00,'Borewell + Rainfed','Maize','Syngenta','NK 6240','Catalogue reference',1300.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',12000.00,'Biofertilizer','Rhizobium',13500.00,26800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-17','Kodgal','Ramesh Raju',58,'Male','Farmer',8.00,'Borewell','Maize','Bayer','DEKALB hybrids','Catalogue reference',1750.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',15500.00,'Biofertilizer','Azotobacter',13000.00,30250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-18','Kodgal','Srikanth Malla',36,'Male','Farmer',10.00,'Borewell + Rainfed','Maize','Advanta','Commercial maize hybrids','Catalogue reference',1050.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',16000.00,'Urea','46-0-0',24000.00,41050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-19','Kodgal','Praveen Bandi',57,'Male','Farmer',4.00,'Borewell','Maize','Kaveri','Commercial maize hybrids','Catalogue reference',1650.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',16000.00,'DAP','18-46-0',21000.00,38650.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-08-20','Kodgal','Bhavani Kolli',60,'Female','Farmer',6.00,'Borewell + Rainfed','Maize','Pioneer/Corteva','Commercial maize hybrids','Catalogue reference',1100.00,'Insecticide','FMC','Fame','Flubendiamide',16500.00,'MOP','0-0-60',26500.00,44100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-01','Macharam','Venkatesh Mekala',65,'Male','Agricultural Labourer',12.00,'Borewell','Cauliflower','Syngenta','Commercial hybrids','Catalogue reference',1200.00,'Insecticide','Bayer','Trance','Spirotetramat + Flonicamid',18500.00,'Boron','B source',5500.00,25200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-02','Macharam','Srinivas Konda',38,'Male','Farmer',3.00,'Canal','Watermelon','Syngenta','Commercial hybrids','Catalogue reference',1250.00,'Fungicide','Syngenta','Score','Difenoconazole 25% EC',20000.00,'Water-soluble NPK','Various grades',8000.00,29250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-03','Macharam','Anil Dandu',58,'Male','Farmer',5.00,'Borewell + Rainfed','Sweet corn','Syngenta','Commercial hybrids','Catalogue reference',1500.00,'Fungicide','Syngenta','Revus','Mandipropamid 23.4% SC',4500.00,'Biofertilizer','Rhizobium',27000.00,33000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-04','Macharam','Arun Janga',55,'Male','Farmer',12.00,'Borewell + Rainfed','Cotton','Kaveri','ATM / KCH-311 BG II','Catalogue reference',900.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',2500.00,'Biofertilizer','Azotobacter',25500.00,28900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-05','Macharam','Swathi Reddy',67,'Female','Agricultural Labourer',5.00,'Borewell + Rainfed','Cotton','Mahyco','Commercial Bt hybrids','Catalogue reference',1000.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',18000.00,'Urea','46-0-0',11500.00,30500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-06','Macharam','Mohan Goud',56,'Male','Farmer',10.00,'Rainfed','Cotton','Nuziveedu','Commercial Bt hybrids','Catalogue reference',800.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',10500.00,'DAP','18-46-0',7500.00,18800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-07','Macharam','Raghu Yadav',50,'Male','Agricultural Labourer',3.00,'Rainfed','Cotton','JK Agri Genetics','Bt cotton hybrids','Catalogue reference',1000.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',18000.00,'MOP','0-0-60',27500.00,46500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-08','Macharam','Naresh Naik',67,'Male','Farmer',4.00,'Rainfed','Cotton','Rasi','Commercial Bt hybrids','Catalogue reference',850.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',25000.00,'SSP','0-16-0 + S',7000.00,32850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-09','Macharam','Shankar Rao',34,'Male','Farmer',3.00,'Borewell + Rainfed','Cotton','Ajeet Seeds','Bt cotton hybrids','Catalogue reference',1000.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',15500.00,'NPK','10-26-26',21500.00,38000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-10','Macharam','Sandhya Kumar',51,'Female','Farmer',12.00,'Borewell','Maize','Syngenta','NK 6540','Catalogue reference',1400.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',2500.00,'NPK','12-32-16',7500.00,11400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-11','Macharam','Vijay Sharma',68,'Male','Farmer',5.00,'Canal','Maize','Syngenta','NK 6240','Catalogue reference',1600.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',3000.00,'NPK','20-20-0',20500.00,25100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-12','Macharam','Harish Patel',48,'Male','Farmer',2.00,'Borewell','Maize','Bayer','DEKALB hybrids','Catalogue reference',1100.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',23000.00,'Zinc sulphate','Zn source',3000.00,27100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-13','Macharam','Ravi Chary',66,'Male','Farmer',2.00,'Canal','Maize','Advanta','Commercial maize hybrids','Catalogue reference',1150.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',11500.00,'Boron','B source',10500.00,23150.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-14','Macharam','Suresh Gowda',61,'Male','Farmer',6.00,'Borewell','Maize','Kaveri','Commercial maize hybrids','Catalogue reference',2200.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',9500.00,'Water-soluble NPK','Various grades',5000.00,16700.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-15','Macharam','Swathi Raju',30,'Female','Farmer',4.00,'Borewell','Maize','Pioneer/Corteva','Commercial maize hybrids','Catalogue reference',2050.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',19000.00,'Biofertilizer','Rhizobium',26500.00,47550.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-16','Macharam','Ramesh Malla',38,'Male','Farmer',12.00,'Canal','Paddy','Bayer','Arize hybrid rice range','Catalogue reference',950.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',7000.00,'Biofertilizer','Azotobacter',17500.00,25450.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-17','Macharam','Srikanth Bandi',67,'Male','Farmer',4.00,'Borewell + Rainfed','Paddy','Syngenta','Hybrid rice range','Catalogue reference',1300.00,'Insecticide','FMC','Fame','Flubendiamide',5000.00,'Urea','46-0-0',12500.00,18800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-18','Macharam','Praveen Kolli',38,'Male','Farmer',6.00,'Rainfed','Paddy','Kaveri','Hybrid/improved rice range','Catalogue reference',900.00,'Insecticide','Corteva','Delegate','Spinetoram',4500.00,'DAP','18-46-0',9000.00,14400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-19','Macharam','Naveen Madduri',58,'Male','Farmer',3.00,'Canal','Paddy','Mahyco','Hybrid rice range','Catalogue reference',700.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',2500.00,'MOP','0-0-60',13000.00,16200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-09-20','Macharam','Sandhya Palle',39,'Female','Agricultural Labourer',12.00,'Borewell + Rainfed','Paddy','JK Agri Genetics','Rice varieties/hybrids','Catalogue reference',1150.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',12500.00,'SSP','0-16-0 + S',18000.00,31650.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-01','Polepalle','Srinivas Dandu',36,'Male','Agricultural Labourer',2.00,'Rainfed','Cotton','Nuziveedu','Commercial Bt hybrids','Catalogue reference',1000.00,'Fungicide','Syngenta','ABIC','Mancozeb 75% WP',8000.00,'Water-soluble NPK','Various grades',11500.00,20500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-02','Polepalle','Anil Janga',54,'Male','Farmer',6.00,'Borewell','Cotton','JK Agri Genetics','Bt cotton hybrids','Catalogue reference',800.00,'Fungicide','Syngenta','Anvil','Hexaconazole 5% EC',22500.00,'Biofertilizer','Rhizobium',10000.00,33300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-03','Polepalle','Arun Reddy',33,'Male','Farmer',10.00,'Canal','Cotton','Rasi','Commercial Bt hybrids','Catalogue reference',1000.00,'Seed treatment','Syngenta','Vibrance Maxx','Sedaxane + Fludioxonil + Thiamethoxam',21500.00,'Biofertilizer','Azotobacter',22500.00,45000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-04','Polepalle','Kiran Goud',45,'Male','Farmer',2.00,'Borewell','Cotton','Ajeet Seeds','Bt cotton hybrids','Catalogue reference',900.00,'Seed treatment','Syngenta','Vibrance XL','Sedaxane + Fludioxonil + Metalaxyl-M',16000.00,'Urea','46-0-0',20000.00,36900.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-05','Polepalle','Sujatha Yadav',65,'Female','Farmer',12.00,'Borewell','Maize','Syngenta','NK 6540','Catalogue reference',1800.00,'Seed treatment','Syngenta','Victrato','Cyclobutrifluram 41.6% FS',4000.00,'DAP','18-46-0',16000.00,21800.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-06','Polepalle','Raghu Naik',35,'Male','Farmer',3.00,'Rainfed','Maize','Syngenta','NK 6240','Catalogue reference',1500.00,'Seed treatment','Syngenta','Cruiser','Thiamethoxam-based',15500.00,'MOP','0-0-60',17500.00,34500.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-07','Polepalle','Naresh Rao',44,'Male','Farmer',3.00,'Rainfed','Maize','Bayer','DEKALB hybrids','Catalogue reference',1550.00,'Seed treatment','Syngenta','Fortenza Duo','Seed-applied insecticide',12000.00,'SSP','0-16-0 + S',9500.00,23050.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-08','Polepalle','Shankar Kumar',61,'Male','Farmer',4.00,'Borewell','Maize','Advanta','Commercial maize hybrids','Catalogue reference',1500.00,'Insecticide','Bayer','Confidor','Imidacloprid formulation',13500.00,'NPK','10-26-26',28000.00,43000.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-09','Polepalle','Ganesh Sharma',33,'Male','Farmer',12.00,'Borewell','Maize','Kaveri','Commercial maize hybrids','Catalogue reference',2200.00,'Insecticide','Bayer','Oberon','Spiromesifen 22.9 SC',19000.00,'NPK','12-32-16',11000.00,32200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-10','Polepalle','Madhavi Patel',43,'Female','Farmer',4.00,'Rainfed','Maize','Pioneer/Corteva','Commercial maize hybrids','Catalogue reference',2200.00,'Fungicide','Bayer','Nativo','Trifloxystrobin + Tebuconazole',6500.00,'NPK','20-20-0',11500.00,20200.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-11','Polepalle','Harish Chary',38,'Male','Farmer',5.00,'Canal','Paddy','Bayer','Arize hybrid rice range','Catalogue reference',1400.00,'Herbicide','UPL','Saathi','Pyrazosulfuron-ethyl',10500.00,'Zinc sulphate','Zn source',13500.00,25400.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-12','Polepalle','Ravi Gowda',49,'Male','Farmer',8.00,'Rainfed','Paddy','Syngenta','Hybrid rice range','Catalogue reference',1100.00,'Fungicide','UPL','Saaf','Carbendazim + Mancozeb',11000.00,'Boron','B source',9000.00,21100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-13','Polepalle','Suresh Raju',41,'Male','Farmer',6.00,'Canal','Paddy','Kaveri','Hybrid/improved rice range','Catalogue reference',1200.00,'Insecticide','FMC','Coragen','Chlorantraniliprole',8000.00,'Water-soluble NPK','Various grades',13500.00,22700.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-14','Polepalle','Mahesh Malla',45,'Male','Agricultural Labourer',12.00,'Borewell','Paddy','Mahyco','Hybrid rice range','Catalogue reference',750.00,'Insecticide','FMC','Fame','Flubendiamide',22500.00,'Biofertilizer','Rhizobium',17000.00,40250.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-15','Polepalle','Sujatha Bandi',28,'Female','Farmer',5.00,'Canal','Paddy','JK Agri Genetics','Rice varieties/hybrids','Catalogue reference',850.00,'Insecticide','Corteva','Delegate','Spinetoram',19500.00,'Biofertilizer','Azotobacter',27500.00,47850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-16','Polepalle','Srikanth Kolli',37,'Male','Farmer',5.00,'Borewell','Soybean','MAHYCO','Improved soybean varieties','Catalogue reference',2450.00,'Fungicide','Syngenta','Amistar Top','Azoxystrobin + Difenoconazole',3000.00,'Urea','46-0-0',2500.00,7950.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-17','Polepalle','Praveen Madduri',56,'Male','Farmer',5.00,'Borewell','Soybean','NSC','Certified soybean seed','Catalogue reference',2100.00,'Herbicide','Common brands','Pendimethalin formulations','Pendimethalin',23500.00,'DAP','18-46-0',18500.00,44100.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-18','Polepalle','Naveen Palle',54,'Male','Farmer',6.00,'Rainfed','Groundnut','NSC','Certified groundnut varieties','Catalogue reference',2800.00,'Herbicide','Common brands','Atrazine formulations','Atrazine',4000.00,'MOP','0-0-60',9500.00,16300.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-19','Polepalle','Rajesh Mekala',46,'Male','Farmer',4.00,'Borewell','Groundnut','Kaveri','Groundnut varieties','Catalogue reference',3250.00,'Botanical','Multiple brands','Neem/azadirachtin products','Azadirachtin',4500.00,'SSP','0-16-0 + S',8000.00,15750.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY'),('JAD-10-20','Polepalle','Madhavi Konda',34,'Female','Farmer',4.00,'Rainfed','Sunflower','Syngenta','Hybrid sunflower range','Catalogue reference',1350.00,'Bio-pesticide','Multiple brands','Trichoderma','Trichoderma spp.',23500.00,'NPK','10-26-26',15000.00,39850.00,'SYNTHETIC SAMPLE — NOT A REAL PERSON / NOT A FIELD SURVEY');
/*!40000 ALTER TABLE `import_agri_sample` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `input_purchases`
--

DROP TABLE IF EXISTS `input_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `input_purchases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `crop_season_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `purchase_date` date NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `supplier_name` varchar(150) DEFAULT NULL,
  `payment_type` enum('CASH','CREDIT','PARTIAL') NOT NULL DEFAULT 'CREDIT',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_purchase_farmer` (`farmer_id`),
  KEY `fk_purchase_crop` (`crop_season_id`),
  KEY `fk_purchase_product` (`product_id`),
  CONSTRAINT `fk_purchase_crop` FOREIGN KEY (`crop_season_id`) REFERENCES `crop_seasons` (`id`),
  CONSTRAINT `fk_purchase_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `fk_purchase_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `input_purchases`
--

LOCK TABLES `input_purchases` WRITE;
/*!40000 ALTER TABLE `input_purchases` DISABLE KEYS */;
INSERT INTO `input_purchases` VALUES (1,1,1,1,'2026-06-10',10.00,900.00,'Local Agricultural Dealer','CREDIT',0.00,'Cotton seed purchased on farmer credit','2026-08-26 19:16:40'),(2,1,1,2,'2026-06-20',2.00,4374.00,'Local Agricultural Dealer','CREDIT',0.00,'Score fungicide purchased on farmer credit','2026-08-26 19:16:40'),(3,1,1,1,'2026-06-10',10.00,900.00,'Local Agricultural Dealer','CREDIT',0.00,'Cotton seed purchased on farmer credit','2026-08-26 19:32:59'),(4,1,1,2,'2026-06-20',2.00,4374.00,'Local Agricultural Dealer','CREDIT',0.00,'Score fungicide purchased on farmer credit','2026-08-26 19:32:59'),(5,1,1,1,'2026-06-10',10.00,900.00,'Local Agricultural Dealer','CREDIT',0.00,'Cotton seed purchased on farmer credit','2026-08-26 19:33:54'),(6,1,1,2,'2026-06-20',2.00,4374.00,'Local Agricultural Dealer','CREDIT',0.00,'Score fungicide purchased on farmer credit','2026-08-26 19:33:54'),(7,1,1,1,'2026-06-10',10.00,900.00,'Local Agricultural Dealer','CREDIT',0.00,'Cotton seed purchased on farmer credit','2026-08-26 19:38:05'),(8,1,1,2,'2026-06-20',2.00,4374.00,'Local Agricultural Dealer','CREDIT',0.00,'Score fungicide purchased on farmer credit','2026-08-26 19:38:05'),(9,1,1,1,'2026-06-10',10.00,900.00,'Local Agricultural Dealer','CREDIT',0.00,'Cotton seed purchased on farmer credit','2026-08-26 19:38:16'),(10,1,1,2,'2026-06-20',2.00,4374.00,'Local Agricultural Dealer','CREDIT',0.00,'Score fungicide purchased on farmer credit','2026-08-26 19:38:16'),(11,1,1,1,'2026-06-10',10.00,900.00,'Local Agricultural Dealer','CREDIT',0.00,'Cotton seed purchased on farmer credit','2026-08-26 19:38:50'),(12,1,1,2,'2026-06-20',2.00,4374.00,'Local Agricultural Dealer','CREDIT',0.00,'Score fungicide purchased on farmer credit','2026-08-26 19:38:50');
/*!40000 ALTER TABLE `input_purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interest_charges`
--

DROP TABLE IF EXISTS `interest_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interest_charges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `crop_season_id` bigint unsigned DEFAULT NULL,
  `interest_date` date NOT NULL,
  `principal_amount` decimal(14,2) NOT NULL,
  `rate_percent` decimal(5,2) NOT NULL DEFAULT '2.00',
  `interest_amount` decimal(14,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `farmer_id` (`farmer_id`),
  KEY `crop_season_id` (`crop_season_id`),
  CONSTRAINT `interest_charges_ibfk_1` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `interest_charges_ibfk_2` FOREIGN KEY (`crop_season_id`) REFERENCES `crop_seasons` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interest_charges`
--

LOCK TABLES `interest_charges` WRITE;
/*!40000 ALTER TABLE `interest_charges` DISABLE KEYS */;
INSERT INTO `interest_charges` VALUES (1,1,1,'2026-10-16',17748.00,2.00,354.96,'2 percent interest for this settlement period','2026-08-26 19:16:40'),(2,1,1,'2026-10-16',17748.00,2.00,354.96,'2 percent interest for this settlement period','2026-08-26 19:32:59'),(3,1,1,'2026-10-16',17748.00,2.00,354.96,'2 percent interest for this settlement period','2026-08-26 19:33:54'),(4,1,1,'2026-10-16',17748.00,2.00,354.96,'2 percent interest for this settlement period','2026-08-26 19:38:06'),(5,1,1,'2026-10-16',17748.00,2.00,354.96,'2 percent interest for this settlement period','2026-08-26 19:38:16'),(6,1,1,'2026-10-16',17748.00,2.00,354.96,'2 percent interest for this settlement period','2026-08-26 19:38:50');
/*!40000 ALTER TABLE `interest_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `labour_expenses`
--

DROP TABLE IF EXISTS `labour_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labour_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `field_id` bigint unsigned NOT NULL,
  `crop_season_id` bigint unsigned NOT NULL,
  `work_date` date NOT NULL,
  `work_type` varchar(100) NOT NULL,
  `worker_count` int DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_type` enum('CASH','CREDIT','PARTIAL') NOT NULL DEFAULT 'CREDIT',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_labour_farmer` (`farmer_id`),
  KEY `fk_labour_field` (`field_id`),
  KEY `fk_labour_crop` (`crop_season_id`),
  CONSTRAINT `fk_labour_crop` FOREIGN KEY (`crop_season_id`) REFERENCES `crop_seasons` (`id`),
  CONSTRAINT `fk_labour_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `fk_labour_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `labour_expenses`
--

LOCK TABLES `labour_expenses` WRITE;
/*!40000 ALTER TABLE `labour_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `labour_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `market_sales`
--

DROP TABLE IF EXISTS `market_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `market_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `harvest_id` bigint unsigned NOT NULL,
  `sale_date` date NOT NULL,
  `market_name` varchar(150) DEFAULT NULL,
  `buyer_name` varchar(150) DEFAULT NULL,
  `quantity_sold` decimal(12,2) NOT NULL,
  `unit` varchar(30) NOT NULL DEFAULT 'KG',
  `rate_per_unit` decimal(12,2) NOT NULL,
  `gross_amount` decimal(14,2) NOT NULL,
  `commission` decimal(12,2) NOT NULL DEFAULT '0.00',
  `market_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `other_deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `farmer_id` (`farmer_id`),
  KEY `harvest_id` (`harvest_id`),
  CONSTRAINT `market_sales_ibfk_1` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `market_sales_ibfk_2` FOREIGN KEY (`harvest_id`) REFERENCES `harvests` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `market_sales`
--

LOCK TABLES `market_sales` WRITE;
/*!40000 ALTER TABLE `market_sales` DISABLE KEYS */;
INSERT INTO `market_sales` VALUES (1,1,1,'2026-10-16','Jadcherla Market','Jadcherla Cotton Buyer',1000.00,'KG',70.00,70000.00,700.00,0.00,0.00,'Synthetic gold-standard cotton market sale','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `market_sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_name` varchar(150) NOT NULL,
  `category` enum('SEED','PESTICIDE','FERTILIZER','HERBICIDE','FUNGICIDE','OTHER') NOT NULL,
  `brand_name` varchar(150) DEFAULT NULL,
  `unit` varchar(30) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Cotton Seed','SEED','Kaveri','PACK','2026-08-26 19:16:40','2026-08-26 19:16:40'),(2,'Score','FUNGICIDE','Syngenta','L','2026-08-26 19:16:40','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_deductions`
--

DROP TABLE IF EXISTS `sale_deductions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_deductions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `deduction_type` varchar(100) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  CONSTRAINT `sale_deductions_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `market_sales` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_deductions`
--

LOCK TABLES `sale_deductions` WRITE;
/*!40000 ALTER TABLE `sale_deductions` DISABLE KEYS */;
INSERT INTO `sale_deductions` VALUES (1,1,'TRUCK TRANSPORT',1500.00,'Transport charge','2026-08-26 19:16:40'),(2,1,'WEIGHING',200.00,'Market weighing charge','2026-08-26 19:16:40'),(3,1,'MARKET COMMISSION',700.00,'1 percent commission on ₹70,000','2026-08-26 19:16:40'),(4,1,'MOISTURE QUALITY',500.00,'Moisture / quality deduction','2026-08-26 19:16:40'),(5,1,'OTHER MARKET CHARGES',300.00,'Other documented market charges','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `sale_deductions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settlements`
--

DROP TABLE IF EXISTS `settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint unsigned NOT NULL,
  `crop_season_id` bigint unsigned DEFAULT NULL,
  `settlement_date` date NOT NULL,
  `total_crop_sales` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_input_credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_labour_credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_transport` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_deductions` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_interest` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_payments` decimal(14,2) NOT NULL DEFAULT '0.00',
  `final_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `settlement_status` enum('PENDING','PARTIAL','SETTLED') NOT NULL DEFAULT 'PENDING',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `farmer_id` (`farmer_id`),
  KEY `crop_season_id` (`crop_season_id`),
  CONSTRAINT `settlements_ibfk_1` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `settlements_ibfk_2` FOREIGN KEY (`crop_season_id`) REFERENCES `crop_seasons` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settlements`
--

LOCK TABLES `settlements` WRITE;
/*!40000 ALTER TABLE `settlements` DISABLE KEYS */;
INSERT INTO `settlements` VALUES (1,1,1,'2026-10-16',70000.00,17748.00,0.00,1500.00,3200.00,354.96,48697.04,48697.04,'SETTLED','Gold-standard synthetic farmer settlement','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transport_records`
--

DROP TABLE IF EXISTS `transport_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transport_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `harvest_id` bigint unsigned NOT NULL,
  `transport_date` date NOT NULL,
  `truck_number` varchar(50) NOT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `from_location` varchar(150) DEFAULT NULL,
  `to_location` varchar(150) DEFAULT NULL,
  `quantity_loaded` decimal(12,2) DEFAULT NULL,
  `freight_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `loading_charges` decimal(12,2) NOT NULL DEFAULT '0.00',
  `unloading_charges` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_transport_harvest` (`harvest_id`),
  CONSTRAINT `fk_transport_harvest` FOREIGN KEY (`harvest_id`) REFERENCES `harvests` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transport_records`
--

LOCK TABLES `transport_records` WRITE;
/*!40000 ALTER TABLE `transport_records` DISABLE KEYS */;
INSERT INTO `transport_records` VALUES (1,1,'2026-10-15','TS09AB1234','Ravi','Test Village','Jadcherla Market',1000.00,1500.00,0.00,0.00,'Cotton harvest transport','2026-08-26 19:16:40');
/*!40000 ALTER TABLE `transport_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `villages`
--

DROP TABLE IF EXISTS `villages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `villages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `mandal` varchar(100) NOT NULL DEFAULT 'Jadcherla',
  `district` varchar(100) NOT NULL DEFAULT 'Mahabubnagar',
  `state` varchar(100) NOT NULL DEFAULT 'Telangana',
  `pincode` varchar(6) NOT NULL DEFAULT '509301',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  CONSTRAINT `chk_village_pincode` CHECK (regexp_like(`pincode`,_utf8mb4'^[0-9]{6}$'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `villages`
--

LOCK TABLES `villages` WRITE;
/*!40000 ALTER TABLE `villages` DISABLE KEYS */;
INSERT INTO `villages` VALUES (1,'Test Village','Jadcherla','Mahabubnagar','Telangana','509301','2026-08-26 17:55:14','2026-08-26 17:55:14');
/*!40000 ALTER TABLE `villages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_crop_summary`
--

DROP TABLE IF EXISTS `vw_crop_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_crop_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_crop_summary` AS SELECT 
 1 AS `main_crop`,
 1 AS `farmer_records`,
 1 AS `total_land_acres`,
 1 AS `average_land_acres`,
 1 AS `seed_cost`,
 1 AS `pesticide_cost`,
 1 AS `fertilizer_cost`,
 1 AS `total_input_cost`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_farmer_input_summary`
--

DROP TABLE IF EXISTS `vw_farmer_input_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_farmer_input_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_farmer_input_summary` AS SELECT 
 1 AS `sample_id`,
 1 AS `household_name`,
 1 AS `village`,
 1 AS `age`,
 1 AS `gender`,
 1 AS `occupation`,
 1 AS `land_holding_acres`,
 1 AS `irrigation`,
 1 AS `main_crop`,
 1 AS `seed_company_brand`,
 1 AS `seed_variety_product`,
 1 AS `seed_pack_type`,
 1 AS `approx_seed_price_inr`,
 1 AS `pesticide_category`,
 1 AS `pesticide_company`,
 1 AS `pesticide_product`,
 1 AS `active_ingredient_composition`,
 1 AS `approx_pesticide_spend_inr`,
 1 AS `fertilizer`,
 1 AS `fertilizer_grade_type`,
 1 AS `approx_fertilizer_spend_inr`,
 1 AS `estimated_annual_input_spend_inr`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_fertilizer_summary`
--

DROP TABLE IF EXISTS `vw_fertilizer_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_fertilizer_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_fertilizer_summary` AS SELECT 
 1 AS `fertilizer`,
 1 AS `fertilizer_grade_type`,
 1 AS `records`,
 1 AS `total_fertilizer_spend`,
 1 AS `average_fertilizer_spend`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_field_summary`
--

DROP TABLE IF EXISTS `vw_field_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_field_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_field_summary` AS SELECT 
 1 AS `sample_id`,
 1 AS `household_name`,
 1 AS `village`,
 1 AS `main_crop`,
 1 AS `land_holding_acres`,
 1 AS `irrigation`,
 1 AS `seed_cost`,
 1 AS `pesticide_cost`,
 1 AS `fertilizer_cost`,
 1 AS `calculated_input_cost`,
 1 AS `estimated_annual_input_spend`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_pesticide_summary`
--

DROP TABLE IF EXISTS `vw_pesticide_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_pesticide_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_pesticide_summary` AS SELECT 
 1 AS `pesticide_category`,
 1 AS `pesticide_company`,
 1 AS `pesticide_product`,
 1 AS `active_ingredient_composition`,
 1 AS `records`,
 1 AS `total_pesticide_spend`,
 1 AS `average_pesticide_spend`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_seed_summary`
--

DROP TABLE IF EXISTS `vw_seed_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_seed_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_seed_summary` AS SELECT 
 1 AS `seed_company_brand`,
 1 AS `seed_variety_product`,
 1 AS `seed_pack_type`,
 1 AS `records`,
 1 AS `total_seed_cost`,
 1 AS `average_seed_cost`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_village_summary`
--

DROP TABLE IF EXISTS `vw_village_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_village_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_village_summary` AS SELECT 
 1 AS `village`,
 1 AS `farmer_records`,
 1 AS `total_land_acres`,
 1 AS `average_land_acres`,
 1 AS `total_input_spend`,
 1 AS `average_input_spend`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_crop_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_crop_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_crop_summary` AS select `import_agri_sample`.`main_crop` AS `main_crop`,count(0) AS `farmer_records`,round(sum(`import_agri_sample`.`land_holding_acres`),2) AS `total_land_acres`,round(avg(`import_agri_sample`.`land_holding_acres`),2) AS `average_land_acres`,round(sum(`import_agri_sample`.`approx_seed_price_inr`),2) AS `seed_cost`,round(sum(`import_agri_sample`.`approx_pesticide_spend_inr`),2) AS `pesticide_cost`,round(sum(`import_agri_sample`.`approx_fertilizer_spend_inr`),2) AS `fertilizer_cost`,round(sum(`import_agri_sample`.`estimated_annual_input_spend_inr`),2) AS `total_input_cost` from `import_agri_sample` group by `import_agri_sample`.`main_crop` order by `total_input_cost` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_farmer_input_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_farmer_input_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_farmer_input_summary` AS select `import_agri_sample`.`sample_id` AS `sample_id`,`import_agri_sample`.`household_name` AS `household_name`,`import_agri_sample`.`village` AS `village`,`import_agri_sample`.`age` AS `age`,`import_agri_sample`.`gender` AS `gender`,`import_agri_sample`.`occupation` AS `occupation`,`import_agri_sample`.`land_holding_acres` AS `land_holding_acres`,`import_agri_sample`.`irrigation` AS `irrigation`,`import_agri_sample`.`main_crop` AS `main_crop`,`import_agri_sample`.`seed_company_brand` AS `seed_company_brand`,`import_agri_sample`.`seed_variety_product` AS `seed_variety_product`,`import_agri_sample`.`seed_pack_type` AS `seed_pack_type`,`import_agri_sample`.`approx_seed_price_inr` AS `approx_seed_price_inr`,`import_agri_sample`.`pesticide_category` AS `pesticide_category`,`import_agri_sample`.`pesticide_company` AS `pesticide_company`,`import_agri_sample`.`pesticide_product` AS `pesticide_product`,`import_agri_sample`.`active_ingredient_composition` AS `active_ingredient_composition`,`import_agri_sample`.`approx_pesticide_spend_inr` AS `approx_pesticide_spend_inr`,`import_agri_sample`.`fertilizer` AS `fertilizer`,`import_agri_sample`.`fertilizer_grade_type` AS `fertilizer_grade_type`,`import_agri_sample`.`approx_fertilizer_spend_inr` AS `approx_fertilizer_spend_inr`,`import_agri_sample`.`estimated_annual_input_spend_inr` AS `estimated_annual_input_spend_inr` from `import_agri_sample` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_fertilizer_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_fertilizer_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_fertilizer_summary` AS select `import_agri_sample`.`fertilizer` AS `fertilizer`,`import_agri_sample`.`fertilizer_grade_type` AS `fertilizer_grade_type`,count(0) AS `records`,round(sum(`import_agri_sample`.`approx_fertilizer_spend_inr`),2) AS `total_fertilizer_spend`,round(avg(`import_agri_sample`.`approx_fertilizer_spend_inr`),2) AS `average_fertilizer_spend` from `import_agri_sample` group by `import_agri_sample`.`fertilizer`,`import_agri_sample`.`fertilizer_grade_type` order by `total_fertilizer_spend` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_field_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_field_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_field_summary` AS select `import_agri_sample`.`sample_id` AS `sample_id`,`import_agri_sample`.`household_name` AS `household_name`,`import_agri_sample`.`village` AS `village`,`import_agri_sample`.`main_crop` AS `main_crop`,`import_agri_sample`.`land_holding_acres` AS `land_holding_acres`,`import_agri_sample`.`irrigation` AS `irrigation`,round(`import_agri_sample`.`approx_seed_price_inr`,2) AS `seed_cost`,round(`import_agri_sample`.`approx_pesticide_spend_inr`,2) AS `pesticide_cost`,round(`import_agri_sample`.`approx_fertilizer_spend_inr`,2) AS `fertilizer_cost`,round(((`import_agri_sample`.`approx_seed_price_inr` + `import_agri_sample`.`approx_pesticide_spend_inr`) + `import_agri_sample`.`approx_fertilizer_spend_inr`),2) AS `calculated_input_cost`,round(`import_agri_sample`.`estimated_annual_input_spend_inr`,2) AS `estimated_annual_input_spend` from `import_agri_sample` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_pesticide_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_pesticide_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_pesticide_summary` AS select `import_agri_sample`.`pesticide_category` AS `pesticide_category`,`import_agri_sample`.`pesticide_company` AS `pesticide_company`,`import_agri_sample`.`pesticide_product` AS `pesticide_product`,`import_agri_sample`.`active_ingredient_composition` AS `active_ingredient_composition`,count(0) AS `records`,round(sum(`import_agri_sample`.`approx_pesticide_spend_inr`),2) AS `total_pesticide_spend`,round(avg(`import_agri_sample`.`approx_pesticide_spend_inr`),2) AS `average_pesticide_spend` from `import_agri_sample` group by `import_agri_sample`.`pesticide_category`,`import_agri_sample`.`pesticide_company`,`import_agri_sample`.`pesticide_product`,`import_agri_sample`.`active_ingredient_composition` order by `total_pesticide_spend` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_seed_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_seed_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_seed_summary` AS select `import_agri_sample`.`seed_company_brand` AS `seed_company_brand`,`import_agri_sample`.`seed_variety_product` AS `seed_variety_product`,`import_agri_sample`.`seed_pack_type` AS `seed_pack_type`,count(0) AS `records`,round(sum(`import_agri_sample`.`approx_seed_price_inr`),2) AS `total_seed_cost`,round(avg(`import_agri_sample`.`approx_seed_price_inr`),2) AS `average_seed_cost` from `import_agri_sample` group by `import_agri_sample`.`seed_company_brand`,`import_agri_sample`.`seed_variety_product`,`import_agri_sample`.`seed_pack_type` order by `total_seed_cost` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_village_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_village_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_village_summary` AS select `import_agri_sample`.`village` AS `village`,count(0) AS `farmer_records`,round(sum(`import_agri_sample`.`land_holding_acres`),2) AS `total_land_acres`,round(avg(`import_agri_sample`.`land_holding_acres`),2) AS `average_land_acres`,round(sum(`import_agri_sample`.`estimated_annual_input_spend_inr`),2) AS `total_input_spend`,round(avg(`import_agri_sample`.`estimated_annual_input_spend_inr`),2) AS `average_input_spend` from `import_agri_sample` group by `import_agri_sample`.`village` */;
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
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-27 10:04:31
