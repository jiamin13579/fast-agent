package com.fast.agent.repository;

import com.fast.agent.entity.User;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper {

    @Select("SELECT * FROM t_user WHERE id = #{id}")
    Optional<User> findById(Long id);

    @Select("SELECT * FROM t_user WHERE email = #{email}")
    Optional<User> findByEmail(String email);

    @Select("SELECT * FROM t_user")
    List<User> findAll();

    @Insert(
            "INSERT INTO t_user (email, phone, nickname, password, role, status, must_change_password, create_time, update_time) "
                    + "VALUES (#{email}, #{phone}, #{nickname}, #{password}, #{role}, #{status}, #{mustChangePassword}, #{createTime}, #{updateTime})")
    void insert(User user);

    @Update(
            "UPDATE t_user SET email=#{email}, phone=#{phone}, nickname=#{nickname}, password=#{password}, "
                    + "role=#{role}, status=#{status}, must_change_password=#{mustChangePassword}, update_time=#{updateTime} WHERE id=#{id}")
    void update(User user);

    @Delete("DELETE FROM t_user WHERE id = #{id}")
    void deleteById(Long id);
}
