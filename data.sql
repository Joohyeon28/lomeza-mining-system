SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict mPEBkIcCBhXbkuGG3gYhySkR8QbDaJpI5CiDyXRGDHVIL26LIGiQINiUGliQg8r

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '9c051cb5-c957-4d52-be13-d23e40ebae57', 'authenticated', 'authenticated', 'admin@lomeza.com', '$2a$10$qTAshw.b68p0oD9Uxoq08.wD5Crxl2fWTNm210qtvsTSxKfawEl.y', '2026-02-19 09:25:50.207343+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-02-24 08:18:00.822757+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-19 09:25:50.17686+00', '2026-02-24 08:18:00.827958+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '7971a22e-f01f-47ff-b1e2-8526b9e646d3', 'authenticated', 'authenticated', 'controller.kalagadi@lomeza.com', '$2a$10$iQwAi6V.hOq3Ahu0599VwO5I8tXvNcN9eU.g8TK6QxPBLr2XzXqlu', '2026-02-23 06:46:38.501632+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-02-24 08:28:26.818924+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-23 06:46:38.443068+00', '2026-02-24 08:28:26.827402+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '525cb3ec-d706-4937-9f83-3364b8297505', 'authenticated', 'authenticated', 'supervisor.kalagadi@lomeza.com', '$2a$10$4Ds5Bp42MUC65/XMaq312O/l/kkwhsFa.VFFiQfh7mlB1h2/DiUb2', '2026-02-23 06:47:23.452658+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-23 06:47:23.443267+00', '2026-02-23 06:47:23.453315+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '1031b839-e5db-4ef6-9197-12afbdefb7da', 'authenticated', 'authenticated', 'controller.sileko@lomeza.com', '$2a$10$JPR9VA2P95WijyucS1NwlOMuqlLf0wKci6NgFdbhsVdH1ug0cArqm', '2026-02-12 19:07:19.22686+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-02-24 08:44:17.672057+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-12 19:07:19.2056+00', '2026-02-24 08:44:17.731479+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '400a6913-c890-4cc2-82e1-b91beaa31daa', 'authenticated', 'authenticated', 'supervisor.sileko@lomeza.com', '$2a$10$zMxFIrqmKYNMxqRBrdmRp.lFsHBzrlocvH1VsdAp4yXO1rnb9FWu2', '2026-02-17 09:08:10.960096+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-02-24 08:17:50.078963+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-17 09:08:10.942071+00', '2026-02-24 08:17:50.08378+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('1031b839-e5db-4ef6-9197-12afbdefb7da', '1031b839-e5db-4ef6-9197-12afbdefb7da', '{"sub": "1031b839-e5db-4ef6-9197-12afbdefb7da", "email": "controller.sileko@lomeza.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-12 19:07:19.220019+00', '2026-02-12 19:07:19.221107+00', '2026-02-12 19:07:19.221107+00', '806cc5c8-9dfa-4070-b591-dd253db73586'),
	('400a6913-c890-4cc2-82e1-b91beaa31daa', '400a6913-c890-4cc2-82e1-b91beaa31daa', '{"sub": "400a6913-c890-4cc2-82e1-b91beaa31daa", "email": "supervisor.sileko@lomeza.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-17 09:08:10.956764+00', '2026-02-17 09:08:10.95683+00', '2026-02-17 09:08:10.95683+00', 'b337f180-d392-46ac-a207-0747c52f3432'),
	('9c051cb5-c957-4d52-be13-d23e40ebae57', '9c051cb5-c957-4d52-be13-d23e40ebae57', '{"sub": "9c051cb5-c957-4d52-be13-d23e40ebae57", "email": "admin@lomeza.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-19 09:25:50.197856+00', '2026-02-19 09:25:50.19791+00', '2026-02-19 09:25:50.19791+00', '71960084-ddde-49cf-947b-69271cbe6c3d'),
	('7971a22e-f01f-47ff-b1e2-8526b9e646d3', '7971a22e-f01f-47ff-b1e2-8526b9e646d3', '{"sub": "7971a22e-f01f-47ff-b1e2-8526b9e646d3", "email": "controller.kalagadi@lomeza.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-23 06:46:38.480677+00', '2026-02-23 06:46:38.480734+00', '2026-02-23 06:46:38.480734+00', '4098f194-2c01-4efe-bf9c-51666282c084'),
	('525cb3ec-d706-4937-9f83-3364b8297505', '525cb3ec-d706-4937-9f83-3364b8297505', '{"sub": "525cb3ec-d706-4937-9f83-3364b8297505", "email": "supervisor.kalagadi@lomeza.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-23 06:47:23.449786+00', '2026-02-23 06:47:23.449835+00', '2026-02-23 06:47:23.449835+00', '2cbb81ad-ff75-42e8-91d7-2cb749513f45');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('8667bd67-8837-40b4-b4a7-85dca5f0c80d', '1031b839-e5db-4ef6-9197-12afbdefb7da', '2026-02-24 08:28:32.517164+00', '2026-02-24 08:28:32.517164+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/127.0.0.0', '102.32.72.242', NULL, NULL, NULL, NULL, NULL),
	('29b11df9-d6e4-4f01-8cac-2713a79fe1d5', '1031b839-e5db-4ef6-9197-12afbdefb7da', '2026-02-24 08:44:17.672161+00', '2026-02-24 08:44:17.672161+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/127.0.0.0', '102.32.72.242', NULL, NULL, NULL, NULL, NULL),
	('4cc6eeb6-4fe2-404d-a0eb-8bead28ab3c5', '1031b839-e5db-4ef6-9197-12afbdefb7da', '2026-02-23 11:35:13.81894+00', '2026-02-24 07:28:35.982263+00', NULL, 'aal1', NULL, '2026-02-24 07:28:35.982142', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/127.0.0.0', '102.32.72.242', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('8667bd67-8837-40b4-b4a7-85dca5f0c80d', '2026-02-24 08:28:32.519777+00', '2026-02-24 08:28:32.519777+00', 'password', '6ebc898e-ceec-4b99-b8ed-1ba2154ae476'),
	('29b11df9-d6e4-4f01-8cac-2713a79fe1d5', '2026-02-24 08:44:17.738516+00', '2026-02-24 08:44:17.738516+00', 'password', '7c3714a8-c39d-450a-bbb2-76cbc5e7de25'),
	('4cc6eeb6-4fe2-404d-a0eb-8bead28ab3c5', '2026-02-23 11:35:13.822134+00', '2026-02-23 11:35:13.822134+00', 'password', 'f0dc10f5-7b7a-4022-931f-3ce7b24552d8');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 186, 'umz3l4e5qgxv', '1031b839-e5db-4ef6-9197-12afbdefb7da', true, '2026-02-23 11:35:13.820161+00', '2026-02-23 14:41:16.698294+00', NULL, '4cc6eeb6-4fe2-404d-a0eb-8bead28ab3c5'),
	('00000000-0000-0000-0000-000000000000', 188, 'mthczx5a5x5m', '1031b839-e5db-4ef6-9197-12afbdefb7da', false, '2026-02-24 07:28:35.937113+00', '2026-02-24 07:28:35.937113+00', 'k4hyqfwhe2fj', '4cc6eeb6-4fe2-404d-a0eb-8bead28ab3c5'),
	('00000000-0000-0000-0000-000000000000', 199, 'gulan5tlszgi', '1031b839-e5db-4ef6-9197-12afbdefb7da', false, '2026-02-24 08:28:32.518431+00', '2026-02-24 08:28:32.518431+00', NULL, '8667bd67-8837-40b4-b4a7-85dca5f0c80d'),
	('00000000-0000-0000-0000-000000000000', 187, 'k4hyqfwhe2fj', '1031b839-e5db-4ef6-9197-12afbdefb7da', true, '2026-02-23 14:41:16.728676+00', '2026-02-24 07:28:35.897747+00', 'umz3l4e5qgxv', '4cc6eeb6-4fe2-404d-a0eb-8bead28ab3c5'),
	('00000000-0000-0000-0000-000000000000', 200, 'xv734zxmcfty', '1031b839-e5db-4ef6-9197-12afbdefb7da', false, '2026-02-24 08:44:17.710288+00', '2026-02-24 08:44:17.710288+00', NULL, '29b11df9-d6e4-4f01-8cac-2713a79fe1d5');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: asset_capabilities; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: assets; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--

INSERT INTO "kalagadi"."assets" ("id", "asset_code", "asset_type", "site", "location", "status", "machine_role", "current_location", "operational_status") VALUES
	('371f212c-dcf7-4e15-a314-afdd99e7d216', 'ADT 07', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('09d41414-9685-445c-b99b-38f548d7b7d1', 'ADT 15', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('e25f71d2-e388-4c8b-b3b1-39231532e25a', 'ADT 16', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('fe5ddf59-6d90-42ea-b6ec-a0abaa671548', 'ADT 24', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('77f0076b-471f-4003-b74a-543330baaecd', 'ADT 25', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('b27b0025-166f-4ad8-8c5b-1236c33b167b', 'ADT 26', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('f108b726-8205-4480-baaf-6c977042d26c', 'ADT 27', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('69a4ab6e-91b2-4500-bcc1-d4c126cafbcb', 'ADT 28', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('12afdea8-6643-4c3c-88df-28410e84dd96', 'ADT 29', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('ba9400ff-0383-440b-bbdf-c103c2cfa21c', 'ADT 30', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('1503cad2-ded0-49c7-8e54-71db743efa74', 'ADT 33', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('c7b20312-1d88-47c4-9d4f-654e8f4e71af', 'RDT 01', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('e3010a86-b41b-4fc3-a6dd-80df075abe8b', 'RDT 02', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('460bdc80-c0cc-4f94-88dd-7fe41da53902', 'RDT 03', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('b9f6c9ab-7f83-4446-8827-2d73cff9e60a', 'RDT 04', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('5dea32b6-e25c-4127-9fc8-3c205595ff91', 'RDT 05', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('1a0d173f-efbd-4235-aebc-a6e2597950e0', 'RDT 06', 'Trucks', 'Kalagadi', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('5dfba140-a698-4992-8b52-6a39c707fdbd', 'EXC 13', 'Excavator', 'Kalagadi', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('a059eb00-388e-44df-8b80-af5133c4f9c5', 'EXC 14', 'Excavator', 'Kalagadi', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('5ff957c8-6bcc-4f86-918b-7c41cd0f1900', 'EXC 15', 'Excavator', 'Kalagadi', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('c31c808d-74b5-4a79-abd4-4f8c0c6f21aa', 'EXC 17', 'Excavator', 'Kalagadi', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('5543b467-1769-407d-8473-d4c3bdecec67', 'EXC 18', 'Excavator', 'Kalagadi', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('a80c2263-e2a4-4f33-b4de-39c8e1ddb98b', 'EXC 19', 'Excavator', 'Kalagadi', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('de988f1e-d347-443e-9c5a-ac93dd6d725d', 'DZR 05', 'Dozer', 'Kalagadi', 'Site', 'ACTIVE', 'SUPPORT', 'SITE', 'ACTIVE'),
	('f9a7e063-74be-4c5c-9ab1-20e847267421', 'DZR 06', 'Dozer', 'Kalagadi', 'Site', 'ACTIVE', 'SUPPORT', 'SITE', 'ACTIVE'),
	('4ccd4ec0-328a-42f3-a4ea-83d525e11db9', 'DB 02', 'Diesel Bowser', 'Kalagadi', 'Site', 'ACTIVE', 'OTHER', 'SITE', 'ACTIVE'),
	('1aa88ae5-1205-4af7-ae0e-8704f93e086f', 'GR 05', 'Graders', 'Kalagadi', 'Site', 'ACTIVE', 'OTHER', 'SITE', 'ACTIVE'),
	('3481c493-219d-4bfa-896b-e1d743934d01', 'COMP 001', 'Compactor Roller', 'Kalagadi', 'Site', 'ACTIVE', 'OTHER', 'SITE', 'ACTIVE'),
	('cdf266ff-be43-48c4-aa62-f3aa4651d1be', 'LMZ FEL 01', 'FEL', 'Kalagadi', 'Site', 'ACTIVE', 'SERVICE', 'SITE', 'ACTIVE'),
	('0d0e14d8-12d2-4c43-99cc-9f2ffe5f02d9', 'LMZ FEL 02', 'FEL', 'Kalagadi', 'Site', 'ACTIVE', 'SERVICE', 'SITE', 'ACTIVE'),
	('d0650fd5-7494-4f25-9c4f-633ef1133f48', 'LMZ FEL 03', 'FEL', 'Kalagadi', 'Site', 'ACTIVE', 'SERVICE', 'SITE', 'ACTIVE'),
	('e85dc1bf-bd4d-4432-bb7a-56a22a029265', 'CLU RB 01', 'Underground Drill', 'Kalagadi', 'Site', 'ACTIVE', 'DRILL', 'SITE', 'ACTIVE'),
	('2b384415-b07f-488d-a12e-d9d2fcdafb5c', 'CLU RB 02', 'Underground Drill', 'Kalagadi', 'Site', 'ACTIVE', 'DRILL', 'SITE', 'ACTIVE'),
	('4cfb2f14-d910-4324-8f8e-7431bb9e4e6c', 'CLU DR 01', 'Underground Drill', 'Kalagadi', 'Site', 'ACTIVE', 'DRILL', 'SITE', 'ACTIVE'),
	('fe44e38b-5620-4deb-8ace-46f4032c6d5e', 'CLU DR 02', 'Underground Drill', 'Kalagadi', 'Site', 'ACTIVE', 'DRILL', 'SITE', 'ACTIVE'),
	('3ffc9ce7-abd4-4fef-9fd1-20afcb794d63', 'CLU DR 03', 'Underground Drill', 'Kalagadi', 'Site', 'ACTIVE', 'DRILL', 'SITE', 'ACTIVE'),
	('3f32d4c2-2090-4eed-b4b3-b9141ca37cdf', 'JC 03', 'Crusher', 'Kalagadi', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE'),
	('96c46757-05ac-4ba8-9ad1-4a8c282bd17f', 'JC 04', 'Crusher', 'Kalagadi', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE'),
	('6b14fc78-649d-4602-92b0-dd6c7cf5bc05', 'SC 01', 'Screen', 'Kalagadi', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE'),
	('a788f03a-e15d-49aa-876b-03331869e5d2', 'SC 02', 'Screen', 'Kalagadi', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE'),
	('579443fc-0915-4220-a9c9-b6a23548ecee', 'SC 03', 'Screen', 'Kalagadi', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE');


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: breakdown_events; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: breakdowns; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: daily_plans; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: daily_plan_machines; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: exceptions; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: production_points; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: haul_entries; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: shift_templates; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: shifts; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: machine_shift_status; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: machine_state; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: production_entries; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: shift_definitions; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: shift_plans; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: workshop_jobs; Type: TABLE DATA; Schema: kalagadi; Owner: postgres
--



--
-- Data for Name: asset_capabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: breakdown_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "name", "email", "password", "role", "site") VALUES
	('1031b839-e5db-4ef6-9197-12afbdefb7da', 'Controller Sileko', 'controller.sileko@lomeza.com', '', 'controller', 'sileko'),
	('400a6913-c890-4cc2-82e1-b91beaa31daa', 'Supervisor Sileko', 'supervisor.sileko@lomeza.com', '', 'supervisor', 'sileko'),
	('9c051cb5-c957-4d52-be13-d23e40ebae57', 'Admin User', 'admin@lomeza.com', '', 'admin', NULL),
	('7971a22e-f01f-47ff-b1e2-8526b9e646d3', 'Controller Kalagadi', 'controller.kalagadi@lomeza.com', '', 'controller', 'kalagadi'),
	('525cb3ec-d706-4937-9f83-3364b8297505', 'Supervisor Kalagadi', 'supervisor.kalagadi@lomeza.com', '', 'supervisor', 'kalagadi');


--
-- Data for Name: breakdowns; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_plan_machines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: exceptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: production_points; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: haul_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: shift_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: machine_shift_status; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: machine_state; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: production_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: shift_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: shift_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workshop_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: asset_capabilities; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: assets; Type: TABLE DATA; Schema: sileko; Owner: postgres
--

INSERT INTO "sileko"."assets" ("id", "asset_code", "asset_type", "site", "location", "status", "machine_role", "current_location", "operational_status") VALUES
	('d60d2e07-f8e4-461c-8fb9-1a3ac9ecb508', 'TMM-D001', 'Dump Truck', 'Sileko', 'Pit A', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('fb18fa71-04ec-4fbc-8b35-8b9f5291ea83', 'TMM-E001', 'Excavator', 'Sileko', 'Pit B', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('f4b40daf-989f-4216-a635-f2f357a6a4b1', 'ADT 08', 'Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('6af8cbb5-08cb-4a08-ab42-95942370acd0', 'ADT 21', 'Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('f10f8606-2192-4985-b098-e35aeff0c98a', 'ADT 22', 'Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('f50be781-ccfa-4f44-b794-1fdd75b46977', 'ADT 23', 'Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('1940c3f5-e155-4a37-9767-2e54fe01e2fd', 'ADT 31', 'Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('f8a3a378-b543-42aa-947d-0715f4276431', 'ADT 32', 'Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('0fa92d1e-7739-42ab-8981-d804f003dc53', 'EXC 10', 'Excavators', 'Sileko', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('7a3bf0f9-5fae-4e1b-b3ac-58c600fe3711', 'EXC 11', 'Excavators', 'Sileko', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('f7a8b0c9-9b77-4372-ab37-6954842aff9c', 'EXC 12', 'Excavators', 'Sileko', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('d9b338e3-be45-4a73-a82b-0fd3d1ef4834', 'EXC 16', 'Excavators', 'Sileko', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('64079f20-a7d1-495e-b6a5-b3b54c8bcf54', 'EXC 20', 'Excavators', 'Sileko', 'Site', 'ACTIVE', 'PRODUCER', 'SITE', 'ACTIVE'),
	('2c859bff-a6fa-45ec-8b07-f78aa6468828', 'DZR 01', 'Dozer', 'Sileko', 'Site', 'ACTIVE', 'SUPPORT', 'SITE', 'ACTIVE'),
	('6232b9a7-5031-4fe2-b1ab-1b82afd526db', 'JC 01', 'Crusher', 'Sileko', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE'),
	('8f085921-726c-4c53-800b-dbd2a87f6910', 'JC 02', 'Crusher', 'Sileko', 'Site', 'ACTIVE', 'CRUSHER', 'SITE', 'ACTIVE'),
	('bd94b051-38e0-4a3c-a164-6e0c54aa01ba', 'DB 01', 'Diesel Bowser', 'Sileko', 'Site', 'ACTIVE', 'OTHER', 'SITE', 'ACTIVE'),
	('510aa0b2-4e31-4450-8f8f-1fa926ffef73', 'GR 04', 'Graders', 'Sileko', 'Site', 'ACTIVE', 'OTHER', 'SITE', 'ACTIVE'),
	('6ca388a6-c1c8-4584-9d84-59a1aaf709d8', 'TK 01 L', 'Mini Trucks', 'Sileko', 'Site', 'ACTIVE', 'HAULER', 'SITE', 'ACTIVE'),
	('ebcb40f0-1d79-4169-b153-f2c23330e66d', 'LMZ FEL 04', 'FEL', 'Sileko', 'Site', 'ACTIVE', 'SERVICE', 'SITE', 'ACTIVE'),
	('b859f6f6-e057-4b47-adcf-c9b43a18f1e5', 'LMZ FEL 05', 'FEL', 'Sileko', 'Site', 'ACTIVE', 'SERVICE', 'SITE', 'ACTIVE'),
	('d5523814-2e12-431e-b641-affc61af9ffa', 'LMZ FEL 06', 'FEL', 'Sileko', 'Site', 'ACTIVE', 'SERVICE', 'SITE', 'ACTIVE');


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: breakdown_events; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: breakdowns; Type: TABLE DATA; Schema: sileko; Owner: postgres
--

INSERT INTO "sileko"."breakdowns" ("id", "asset_id", "site", "reason", "reported_by", "breakdown_start", "breakdown_end", "resolved_by", "created_at", "status", "operator", "acknowledged", "acknowledged_by", "acknowledged_at", "other_reason") VALUES
	('a7739e95-02de-4959-988f-d97e6308a2d7', 'd60d2e07-f8e4-461c-8fb9-1a3ac9ecb508', 'sileko', 'Tyre issue', NULL, '2026-02-24 08:55:00', NULL, NULL, '2026-02-24 08:55:57.009683', 'OPEN', 'John Doe', false, NULL, NULL, NULL),
	('4d82ba9b-fcb9-404d-9dcd-7931f3c069f6', 'd60d2e07-f8e4-461c-8fb9-1a3ac9ecb508', 'sileko', 'Tyre issue', NULL, '2026-02-24 08:57:00', NULL, NULL, '2026-02-24 08:57:51.370772', 'OPEN', 'John Doe', false, NULL, NULL, NULL),
	('afe084bc-3039-40c1-808c-3f05600c9220', 'd60d2e07-f8e4-461c-8fb9-1a3ac9ecb508', 'sileko', 'Tyre issue', NULL, '2026-02-24 09:01:00', NULL, NULL, '2026-02-24 09:01:40.850023', 'OPEN', 'John Doe', false, NULL, NULL, NULL),
	('20839643-cc1f-4c07-97d1-50a698729e2a', 'd60d2e07-f8e4-461c-8fb9-1a3ac9ecb508', 'sileko', 'Tyre issue', NULL, '2026-02-24 09:01:00', NULL, NULL, '2026-02-24 09:01:56.413555', 'OPEN', 'John Doe', false, NULL, NULL, NULL);


--
-- Data for Name: daily_plans; Type: TABLE DATA; Schema: sileko; Owner: postgres
--

INSERT INTO "sileko"."daily_plans" ("id", "site", "shift_date", "shift", "created_by", "created_at") VALUES
	('e5045296-92f4-439f-b824-2b021c482c64', 'sileko', '2026-02-24', 'DAY', '1031b839-e5db-4ef6-9197-12afbdefb7da', '2026-02-24 08:29:15.165');


--
-- Data for Name: daily_plan_machines; Type: TABLE DATA; Schema: sileko; Owner: postgres
--

INSERT INTO "sileko"."daily_plan_machines" ("id", "daily_plan_id", "machine_id", "material_type", "haul_distance") VALUES
	('4eba0bf2-a544-466c-bba3-fbd98a266114', 'e5045296-92f4-439f-b824-2b021c482c64', 'd60d2e07-f8e4-461c-8fb9-1a3ac9ecb508', 'OB (Mining)', 250),
	('740519bf-debb-4314-88b7-fa4c3a6f3e95', 'e5045296-92f4-439f-b824-2b021c482c64', 'fb18fa71-04ec-4fbc-8b35-8b9f5291ea83', 'OB (Rehabilitation)', 250),
	('97b59d67-4762-413a-920f-22ecf1e7ab11', 'e5045296-92f4-439f-b824-2b021c482c64', 'f4b40daf-989f-4216-a635-f2f357a6a4b1', 'Coal', 250);


--
-- Data for Name: exceptions; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: production_points; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: haul_entries; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: shift_templates; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: shifts; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: machine_shift_status; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: machine_state; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: production_entries; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: shift_definitions; Type: TABLE DATA; Schema: sileko; Owner: postgres
--

INSERT INTO "sileko"."shift_definitions" ("code", "description", "start_hour", "end_hour", "duration_hours") VALUES
	('DAY', 'Day shift (06:00–18:00)', 6, 18, 12),
	('NIGHT', 'Night shift (18:00–06:00)', 18, 6, 12);


--
-- Data for Name: shift_plans; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: workshop_jobs; Type: TABLE DATA; Schema: sileko; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: assets; Type: TABLE DATA; Schema: workshop; Owner: postgres
--

INSERT INTO "workshop"."assets" ("id", "asset_code", "asset_type", "site", "location", "status", "machine_role", "operational_status", "created_at") VALUES
	('e15a9588-83fb-4e1d-a264-2fdf1f08cd6f', 'ADT 09', 'Trucks', 'SUNDRA', 'Workshop', 'ACTIVE', 'HAULER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('9dc849e9-dad2-44d4-a7be-ac676722bffb', 'ADT 10', 'Trucks', 'SUNDRA', 'Workshop', 'ACTIVE', 'HAULER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('e61a49f3-0a92-46c5-b150-1dd3b587bdba', 'ADT 11', 'Trucks', 'SUNDRA', 'Workshop', 'ACTIVE', 'HAULER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('24b78179-52a5-46a4-bc9f-f2dca79d9cc6', 'ADT 17', 'Trucks', 'SUNDRA', 'Workshop', 'ACTIVE', 'HAULER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('7567d586-51d1-4722-b2aa-a2526cb1d62b', 'TLB 01', 'TLD', 'SUNDRA', 'Workshop', 'ACTIVE', 'OTHER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('404c583d-4b46-4533-b58e-00fbd5f5ed78', 'TK 02 L', 'Mini Trucks', 'SUNDRA', 'Workshop', 'ACTIVE', 'HAULER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('572c728b-7860-40be-b5c5-95b9016d8b59', 'DZR 02', 'Dozers', 'SUNDRA', 'Workshop', 'ACTIVE', 'SUPPORT', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('50810dda-757a-4d73-8fb3-8fb2adba9a2a', 'DZR 03', 'Dozers', 'SUNDRA', 'Workshop', 'ACTIVE', 'SUPPORT', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('10f5013b-1ff5-4f35-a58a-d20da6e4a752', 'DZR 04', 'Dozers', 'SUNDRA', 'Workshop', 'ACTIVE', 'SUPPORT', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('d3ededb7-5a8a-462b-a6ef-a6b1041986d4', 'EXC 04', 'Excavators', 'SUNDRA', 'Workshop', 'ACTIVE', 'PRODUCER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('c3ad050d-d3fd-4350-aa5a-e7af04497fd5', 'DB 03', 'Diesel Bowser', 'Devon', 'Workshop', 'ACTIVE', 'OTHER', 'ACTIVE', '2026-02-13 08:05:33.574906'),
	('b9d9aad3-b86a-4013-a96e-0949d13f8be2', 'EXC 06', 'Excavators', 'SUNDRA', 'Workshop', 'ACTIVE', 'PRODUCER', 'ACTIVE', '2026-02-13 13:25:13.427528');


--
-- Data for Name: breakdowns; Type: TABLE DATA; Schema: workshop; Owner: postgres
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 200, true);


--
-- Name: haul_entries_id_seq; Type: SEQUENCE SET; Schema: kalagadi; Owner: postgres
--

SELECT pg_catalog.setval('"kalagadi"."haul_entries_id_seq"', 1, false);


--
-- Name: haul_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."haul_entries_id_seq"', 1, false);


--
-- Name: production_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."production_entries_id_seq"', 42, true);


--
-- Name: production_points_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."production_points_id_seq"', 1, false);


--
-- Name: haul_entries_id_seq; Type: SEQUENCE SET; Schema: sileko; Owner: postgres
--

SELECT pg_catalog.setval('"sileko"."haul_entries_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict mPEBkIcCBhXbkuGG3gYhySkR8QbDaJpI5CiDyXRGDHVIL26LIGiQINiUGliQg8r

RESET ALL;
