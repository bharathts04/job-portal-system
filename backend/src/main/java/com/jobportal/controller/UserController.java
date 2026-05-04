package com.jobportal.controller;

import com.jobportal.model.User;
import com.jobportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    UserRepository userRepository;

    // A simple directory to store uploaded files
    private final String UPLOAD_DIR = "uploads/";

    @GetMapping("/profile")
    @PreAuthorize("hasRole('SEEKER') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByUsername(username);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(null); // don't expose password
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> updateProfile(@RequestBody User profileDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByUsername(username);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setEducation(profileDetails.getEducation());
            user.setSkills(profileDetails.getSkills());
            user.setExperience(profileDetails.getExperience());
            userRepository.save(user);
            return ResponseEntity.ok("Profile updated successfully!");
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/upload-resume")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select a file to upload");
        }

        try {
            // Create uploads directory if it doesn't exist
            File directory = new File(UPLOAD_DIR);
            if (!directory.exists()) {
                directory.mkdir();
            }

            // Save the file locally
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            String originalFileName = file.getOriginalFilename();
            String extension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String fileName = username + "_resume" + extension;
            Path path = Paths.get(UPLOAD_DIR + fileName);
            Files.write(path, file.getBytes());

            // Update user profile with the resume URL
            User user = userRepository.findByUsername(username).get();
            String resumeUrl = "/api/users/download-resume/" + fileName;
            user.setResumeUrl(resumeUrl);
            userRepository.save(user);

            return ResponseEntity.ok("Resume uploaded successfully: " + resumeUrl);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not upload the file: " + e.getMessage());
        }
    }

    @GetMapping("/download-resume/{fileName}")
    public ResponseEntity<?> downloadResume(@PathVariable String fileName) {
        try {
            Path path = Paths.get(UPLOAD_DIR + fileName);
            if (Files.exists(path)) {
                byte[] data = Files.readAllBytes(path);
                String contentType = Files.probeContentType(path);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                        .header("Content-Disposition", "inline; filename=\"" + fileName + "\"")
                        .body(data);
            }
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
