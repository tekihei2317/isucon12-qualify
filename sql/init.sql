DELETE FROM tenant WHERE id > 100;
DELETE FROM visit_history WHERE created_at >= '1654041600';
-- UPDATE id_generator SET id=2678400000 WHERE stub='a';
delete from id_generator;
insert into id_generator (id, stub) values (2678400000, 'a');
ALTER TABLE id_generator AUTO_INCREMENT=2678400000;
