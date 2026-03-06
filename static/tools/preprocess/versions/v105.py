from .base import BaseCalcsAdapter


class V105CalcsAdapter(BaseCalcsAdapter):
    def skill_lookup_values(self):
        values = []
        for i in range(13, 21):
            values.append(f"Param{i}")
        for i in range(7, 11):
            values.append(f"calc{i}")
            values.append(f"Calc{i}")
        values.append("AuraEvent4")
        return values

    def missile_lookup_values(self):
        return ["Radius", "Param1", "Param2", "Param3", "Param4", "Param5"]

    def expand_overrides(self):
        overrides = {
            "rad": {
                "static": True,
                "value": "Radius"
            },
            "auraevent4": {
                "static": True,
                "value": "AuraEvent4",
            },
        }
        for i in range(13, 21):
            overrides[f"par{i}"] = {
                "static": True,
                "value": f"Param{i}",
            }
        for i in range(7, 11):
            overrides[f"clc{i}"] = {
                "static": True,
                "value": f"calc{i}",
            }
        return overrides

    def missing_lookup_value(self, table_name, lookup_key, _row):
        if table_name == "missiles" and lookup_key == "LevRange":
            return "0"
        return None

    def skilldesc_row(self, skill_id, skills_row, skilldesc_rows):
        skilldesc_name = skills_row.get("skilldesc", "")
        for row in skilldesc_rows:
            if row.get("skilldesc", "") == skilldesc_name:
                return row
        return super().skilldesc_row(skill_id, skills_row, skilldesc_rows)

    def name_desc_keys(self, _skill_id, _char_class, _skills_row, skilldesc_row):
        return (skilldesc_row.get("str name"), skilldesc_row.get("str long"))

    def missing_string_value(self, string_key):
        return string_key
