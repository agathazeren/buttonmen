ALTER TABLE button ADD sort_order INT NOT NULL DEFAULT 0;

UPDATE button SET sort_order=1 WHERE name='RandomBMVanilla';
UPDATE button SET sort_order=2 WHERE name='RandomBMAnime';
UPDATE button SET sort_order=3 WHERE name='RandomBMMixed';
UPDATE button SET sort_order=4 WHERE name='RandomBMFixed';

INSERT INTO button (id, name, recipe, btn_special, tourn_legal, set_id, sort_order) VALUES
(10005, 'RandomBMMonoskill',  '', 1, 0, (SELECT id FROM buttonset WHERE name="RandomBM"), 5),
(10006, 'RandomBMDuoskill',   '', 1, 0, (SELECT id FROM buttonset WHERE name="RandomBM"), 6),
(10007, 'RandomBMTriskill',   '', 1, 0, (SELECT id FROM buttonset WHERE name="RandomBM"), 7),
(10008, 'RandomBMTetraskill', '', 1, 0, (SELECT id FROM buttonset WHERE name="RandomBM"), 8),
(10009, 'RandomBMPentaskill', '', 1, 0, (SELECT id FROM buttonset WHERE name="RandomBM"), 9);

UPDATE button
SET flavor_text='This button gets a different random recipe in each game, with four regular dice and one swing die, and 1 skill appearing a total of 2 times on various dice.'
WHERE name='RandomBMMonoskill';

UPDATE button
SET flavor_text='This button gets a different random recipe in each game, with four regular dice and one swing die, and 2 skills appearing a total of 5 times on various dice.'
WHERE name='RandomBMDuoskill';

UPDATE button
SET flavor_text='This button gets a different random recipe in each game, with four regular dice and one swing die, and 3 skills appearing a total of 7 times on various dice.'
WHERE name='RandomBMTriskill';

UPDATE button
SET flavor_text='This button gets a different random recipe in each game, with four regular dice and one swing die, and 4 skills appearing a total of 10 times on various dice.'
WHERE name='RandomBMTetraskill';

UPDATE button
SET flavor_text='This button gets a different random recipe in each game, with four regular dice and one swing die, and 5 skills appearing a total of 13 times on various dice.'
WHERE name='RandomBMPentaskill';
