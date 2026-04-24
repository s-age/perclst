Procedure ファイルの命名は **目的（何をするか）** を動詞句で表す。対応する skill 名を流用してはいけない。

Procedure は skill を再利用するものであり、skill 名をそのまま procedure 名にすると「何をするか」ではなく「何を使うか」になってしまう。

**Good**: `create-planning-pipeline.md`、`curate-knowledge.md`
**Bad**: `meta-pipeline-creator.md`（skill 名の流用）、`meta-librarian.md`（skill 名の流用）

Skill と Procedure の役割分担:
- Skill = HOW（どうやるか）の知識庫
- Procedure = WHAT（何をするか）の定義。Skill を `Consult the <skill> skill` で参照する
