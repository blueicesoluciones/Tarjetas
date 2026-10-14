-- Último mensaje (campaña o «Te extrañamos») para el pase de Apple Wallet.
-- Apple no tiene un endpoint de mensajes como Google: el texto va en un campo
-- del pase con changeMessage y el iPhone lo muestra al recibir el pase nuevo.
alter table public.cards add column apple_message text check (apple_message is null or char_length(apple_message) <= 400);
