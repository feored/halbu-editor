class BaseCalcsAdapter:
    def skill_lookup_values(self):
        return []

    def missile_lookup_values(self):
        return []

    def expand_overrides(self):
        return {}

    def missing_lookup_value(self, table_name, lookup_key, _row):
        return None

    def skilldesc_row(self, skill_id, _skills_row, skilldesc_rows):
        idx = skill_id if skill_id <= 155 else skill_id - 61
        return skilldesc_rows[idx]

    def name_desc_keys(self, skill_id, char_class, _skills_row, _skilldesc_row):
        if skill_id == 61:
            return (f"skillsname{skill_id}", f"skillld{skill_id}")
        if skill_id in (222, 223):
            return (None, None)

        row_id = skill_id
        name_base = "skillname"
        desc_base = "skillld"
        if char_class in ("Assassin", "Druid"):
            row_id += 1
            name_base = name_base.capitalize()
            desc_base = desc_base.capitalize()
        return (f"{name_base}{row_id}", f"{desc_base}{row_id}")

    def missing_string_value(self, _string_key):
        return None
